import logging
import google.generativeai as genai
from app.core.config import settings
from app.services.rag.retriever import RobustRAGRetriever
from app.repositories.chat_repo import ChatRepository
from app.services.ai.prompts import RAG_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

class ChatAgentService:
    def __init__(self, retriever: RobustRAGRetriever, chat_repo: ChatRepository):
        self.retriever = retriever
        self.chat_repo = chat_repo
        self.sandbox = False
        if not self.sandbox:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-1.5-pro')

    async def _format_context(self, docs: list[dict]) -> str:
        blocks = []
        for doc in docs:
            text_val = doc["metadata"].get("text", doc.get("body_text", ""))
            block = (
                f"--- BEGIN SOURCE ---\n"
                f"Source ID: {doc['email_id']}\n"
                f"Date: {doc['received_at']}\n"
                f"Sender: {doc['from_email']}\n"
                f"Subject: {doc['subject']}\n"
                f"Content: {text_val}\n"
                f"--- END SOURCE ---"
            )
            blocks.append(block)
        return "\n\n".join(blocks)

    async def handle_message(self, user_id: str, account_id: str, session_id: str, query: str) -> dict:
        """Processes a query, retrieves emails, formats prompts, calls Gemini, and logs citations."""
        logger.info(f"RAG Chat query received for session {session_id}: '{query}'")
        
        # 1. Retrieve Context
        docs = await self.retriever.retrieve_context(account_id, query)
        context_string = await self._format_context(docs)
        source_email_ids = list(set([d['email_id'] for d in docs]))

        # 2. Gather Conversational Memory
        history = await self.chat_repo.get_session_history(session_id, limit=6)
        memory_string = "\n".join([f"{msg.role}: {msg.content}" for msg in history])

        # 3. Handle Sandbox Mode Generation
        if self.sandbox:
            logger.info("Sandbox Mode: Simulating chat agent reply.")
            
            # Simple rule-based mock answers matching the seeded data
            text_query = query.lower()
            if "proposal" in text_query or "launch" in text_query or "spec" in text_query:
                answer = (
                    "Based on your emails, your manager sent a project proposal asking for the Gmail sync "
                    "and summarization specifications, stating it needs to be deployed by Friday "
                    "[Source: 00000000-0000-0000-0000-000000000101]. You replied that you are building the backend "
                    "using FastAPI, Next.js, and Supabase, which supports automated categorization "
                    "and semantic chat [Source: 00000000-0000-0000-0000-000000000102]."
                )
                cited = ["00000000-0000-0000-0000-000000000101", "00000000-0000-0000-0000-000000000102"]
            elif "invoice" in text_query or "nvidia" in text_query or "billing" in text_query or "credit" in text_query:
                answer = (
                    "You have an invoice from NVIDIA NIM for credits. Invoice #1024 is for a monthly fee "
                    "of $150.00, which is due by the end of the month [Source: 00000000-0000-0000-0000-000000000103]."
                )
                cited = ["00000000-0000-0000-0000-000000000103"]
            else:
                # Fallback sandbox answer incorporating the first retrieved document
                if source_email_ids:
                    first_id = source_email_ids[0]
                    first_doc = docs[0]
                    answer = (
                        f"I found a relevant email from {first_doc['from_email']} about '{first_doc['subject']}' "
                        f"[Source: {first_id}]. It mentions: \"{first_doc['body_text'][:100]}...\""
                    )
                    cited = [first_id]
                else:
                    answer = "I cannot find any relevant email context regarding your query."
                    cited = []
                    
            await self.chat_repo.save_message(session_id, "user", query, [])
            await self.chat_repo.save_message(session_id, "assistant", answer, cited)
            return {
                "answer": answer,
                "cited_sources": cited
            }

        # 4. Formulate Production Prompt
        prompt = RAG_SYSTEM_PROMPT.format(
            context_blocks=context_string,
            chat_memory=memory_string,
            user_query=query
        )

        try:
            # 5. Generate Answer
            response = await self.model.generate_content_async(prompt)
            answer = response.text.strip()
            
            # Parse only the UUIDs the model actually cited in the text
            import re
            citation_regex = re.compile(r'\[Source:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]', re.IGNORECASE)
            cited_uuids = list(set(citation_regex.findall(answer)))
            # Ensure cited UUIDs belong to the retrieved document set to prevent hallucination
            actual_source_ids = [uid for uid in cited_uuids if uid in [d['email_id'] for d in docs]]
            
            # Save messages
            await self.chat_repo.save_message(session_id, "user", query, [])
            await self.chat_repo.save_message(session_id, "assistant", answer, actual_source_ids)
            
            return {
                "answer": answer,
                "cited_sources": actual_source_ids
            }
        except Exception as e:
            logger.error(f"Gemini chat response synthesis failed: {e}")
            err_msg = "An error occurred while synthesizing the response. Please try again."
            return {
                "answer": err_msg,
                "cited_sources": []
            }
        
    async def create_new_session(self, user_id: str, title: str | None = None) -> dict:
        return await self.chat_repo.create_session(user_id, title)
        
    async def get_sessions(self, user_id: str) -> list[dict]:
        return await self.chat_repo.get_sessions_by_user(user_id)
        
    async def get_session_messages(self, session_id: str) -> list[dict]:
        return await self.chat_repo.get_session_history(session_id, limit=50)
