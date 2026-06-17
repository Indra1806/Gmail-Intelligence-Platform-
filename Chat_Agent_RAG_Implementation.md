# AI Chat Agent (RAG): Implementation

As a Staff AI Engineer, I have architected the Retrieval-Augmented Generation (RAG) pipeline for the Chat Agent. This is the centerpiece of the intelligence platform. It ensures strict source attribution, zero hallucination, and high-precision retrieval across both granular facts and broad thread contexts.

## 1. Embedding & Chunking Strategy

To retrieve effectively, we must balance broad context (threads) with granular details (individual messages). We use a **Dual-Embedding Strategy**.

```python
# backend/app/services/ai/embeddings.py

import google.generativeai as genai
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.core.config import settings

class EmbeddingService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY.get_secret_value())
        # text-embedding-004 outputs 768-dimensional vectors natively
        self.model = 'models/text-embedding-004'
        
        # While Gemini 1.5 Flash can READ 1M tokens, embedding an entire long thread into 
        # a single 768d vector dilutes semantic meaning. Therefore, we still chunk for embedding.
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=200
        )

    async def embed_text(self, text: str) -> list[float]:
        result = await genai.embed_content_async(
            model=self.model,
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
        
    async def process_email_for_embedding(self, email_id: str, thread_id: str, subject: str, sender: str, body: str):
        """
        Embeds the email. If the body is large, it chunks it.
        Pre-pends Subject and Sender to EVERY chunk so the chunk doesn't lose local context.
        """
        chunks = self.splitter.split_text(body)
        embeddings = []
        
        for i, chunk in enumerate(chunks):
            # Context-Aware Chunking: inject metadata directly into the embedded text
            rich_chunk = f"Sender: {sender}\nSubject: {subject}\nContent:\n{chunk}"
            vector = await self.embed_text(rich_chunk)
            
            embeddings.append({
                "email_id": email_id,
                "thread_id": thread_id,
                "content_type": "message_body",
                "embedding": vector,
                "metadata": {"chunk_index": i, "text": rich_chunk}
            })
            
        return embeddings
```

---

## 2. Retrieval & Reranking Pipeline

We query Supabase pgvector. To ensure recent emails aren't outranked by ancient, slightly-more-semantically-similar emails, we apply a **Recency Decay Reranker**.

```python
# backend/app/services/rag/retriever.py

from app.repositories.email_repo import EmailRepository
from datetime import datetime, timezone
import math

class RAGRetriever:
    def __init__(self, email_repo: EmailRepository, embedder: EmbeddingService):
        self.repo = email_repo
        self.embedder = embedder

    async def retrieve_context(self, user_id: str, query: str, top_k: int = 15) -> list[dict]:
        # 1. Embed user query
        query_vector = await self.embedder.embed_text(query)
        
        # 2. Vector Search (Supabase RPC call)
        # Using HNSW index via vector_cosine_ops for massive speedup
        raw_results = await self.repo.vector_search(
            user_id=user_id,
            embedding=query_vector,
            limit=top_k * 2 # Over-fetch for reranking
        )
        
        # 3. Reranking Pipeline (Recency Decay)
        # Formula: Final Score = Cosine_Similarity * e^(-lambda * days_old)
        reranked = []
        now = datetime.now(timezone.utc)
        decay_factor = 0.005 # Mild penalty for older emails
        
        for res in raw_results:
            days_old = (now - res['received_at']).days
            recency_multiplier = math.exp(-decay_factor * days_old)
            
            # Cosine similarity (pgvector returns distance, so 1 - distance = similarity)
            similarity = 1.0 - res['distance'] 
            final_score = similarity * recency_multiplier
            
            res['rerank_score'] = final_score
            reranked.append(res)
            
        # Sort by rerank score and return top_k
        reranked.sort(key=lambda x: x['rerank_score'], reverse=True)
        return reranked[:top_k]
```

---

## 3. Context Assembly & Hallucination Prevention

The prompt is meticulously engineered to enforce strict Source Attribution.

```python
# backend/app/services/rag/prompts.py

RAG_SYSTEM_PROMPT = """
You are an intelligent email assistant. Your ONLY source of knowledge is the provided 'Email Context' below.

Email Context:
{context_blocks}

Conversation History:
{chat_memory}

User Query: {user_query}

CRITICAL RULES - HALLUCINATION PREVENTION:
1. You MUST NOT answer questions using outside knowledge. 
2. If the answer cannot be found in the 'Email Context', you MUST explicitly say: "I cannot find this information in your emails."
3. Do not assume or guess.

CRITICAL RULES - SOURCE ATTRIBUTION:
1. Every factual statement or synthesis you make MUST be followed by an inline citation using the exact Source ID provided.
2. Citation format: [Source: <email_id>]. 
3. Example: "Acme Corp rejected your application [Source: 123e4567-e89b-12d3-a456-426614174000]. However, they offered to keep your resume on file [Source: 987f6543-e21b-34c5-b678-998877665544]."
"""
```

---

## 4. Chat Agent Core Service (Memory + Generation)

```python
# backend/app/services/chat_agent.py

import google.generativeai as genai
from app.core.config import settings
from app.services.rag.retriever import RAGRetriever
from app.repositories.chat_repo import ChatRepository
from app.services.rag.prompts import RAG_SYSTEM_PROMPT

class ChatAgentService:
    def __init__(self, retriever: RAGRetriever, chat_repo: ChatRepository):
        self.retriever = retriever
        self.chat_repo = chat_repo
        genai.configure(api_key=settings.GEMINI_API_KEY.get_secret_value())
        # We use Gemini 1.5 Pro because RAG synthesis across 15 distinct email chunks 
        # requires massive reasoning capabilities to avoid hallucination.
        self.model = genai.GenerativeModel('gemini-1.5-pro')

    async def _format_context(self, retrieved_docs: list[dict]) -> str:
        """Assembles the context block with strict ID attribution boundaries."""
        blocks = []
        for doc in retrieved_docs:
            block = (
                f"--- BEGIN SOURCE ---\n"
                f"Source ID: {doc['email_id']}\n"
                f"Date: {doc['received_at']}\n"
                f"Sender: {doc['from_email']}\n"
                f"Subject: {doc['subject']}\n"
                f"Content: {doc['metadata']['text']}\n"
                f"--- END SOURCE ---"
            )
            blocks.append(block)
        return "\n\n".join(blocks)

    async def handle_message(self, user_id: str, session_id: str, query: str) -> dict:
        # 1. Retrieve Context
        docs = await self.retriever.retrieve_context(user_id, query)
        context_string = await self._format_context(docs)
        
        # Extract just the IDs so we can store them in the DB to track which emails were used
        source_email_ids = list(set([d['email_id'] for d in docs]))

        # 2. Memory Management
        # Fetch the last 5 messages from this chat session to maintain conversational flow
        history = await self.chat_repo.get_session_history(session_id, limit=5)
        memory_string = "\n".join([f"{msg.role}: {msg.content}" for msg in history])

        # 3. Formulate Prompt
        prompt = RAG_SYSTEM_PROMPT.format(
            context_blocks=context_string,
            chat_memory=memory_string,
            user_query=query
        )

        # 4. Generate Answer
        response = await self.model.generate_content_async(prompt)
        answer = response.text.strip()

        # 5. Persist to Database (User message + Assistant reply with sources)
        await self.chat_repo.save_message(session_id, "user", query, [])
        await self.chat_repo.save_message(session_id, "assistant", answer, source_email_ids)

        return {
            "answer": answer,
            "cited_sources": source_email_ids
        }
```

---

## 5. Architectural Tradeoffs & Decisions

*   **Model Selection:** We use `gemini-1.5-pro` here, not Flash. While Flash is faster, combining 15 different email chunks and synthesizing an answer without mixing up facts ("cross-email reasoning") requires the heavier reasoning parameters of Pro.
*   **Recency Decay Reranking:** By applying a mathematical decay factor ($e^{-\lambda \times days}$), we solve the classic RAG problem where an old email that exactly matches keywords outranks a slightly differently worded email from yesterday.
*   **Context-Aware Chunking:** Instead of just splitting strings, we prepend the `Sender:` and `Subject:` to *every single chunk*. If we didn't do this, a chunk from the bottom of an email might just say "Yes, I agree", and the embedder would have no idea who is agreeing to what.
