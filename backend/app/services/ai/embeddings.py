import logging
import google.generativeai as genai
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.sandbox = settings.SANDBOX_MODE
        if not self.sandbox:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = 'models/gemini-embedding-exp-03-07'
        
        # 1500 characters chunk size with 200 character overlap
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=200
        )

    async def embed_text(self, text: str) -> list[float]:
        if self.sandbox:
            # Return dummy 768-dim vector
            return [0.1] * 768

        try:
            result = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Gemini embedding generation failed: {e}")
            # Fallback to dummy vector instead of breaking sync
            return [0.0] * 768

    async def process_email_for_embedding(self, email_id: str, thread_id: str, subject: str, sender: str, body: str) -> list[dict]:
        """Chunks an email body, prepending Subject & Sender to preserve context, then embeds."""
        chunks = self.splitter.split_text(body)
        embeddings = []
        
        for i, chunk in enumerate(chunks):
            # Inject sender and subject directly into chunk text (Context-Aware Embedding)
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
