import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class NIMRerankingService:
    def __init__(self):
        self.sandbox = settings.SANDBOX_MODE
        self.api_key = settings.NVIDIA_NIM_API_KEY
        self.url = "https://integrate.api.nvidia.com/v1/rerank"
        self.model = "nvidia/nv-rerankqa-mistral-4b-v3"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    async def rerank_documents(self, query: str, documents: list[dict], top_n: int = 10) -> list[dict]:
        """Sends documents to NVIDIA NIM Cross-Encoder to evaluate precise relevance scores."""
        if not documents:
            return []
            
        if self.sandbox:
            logger.info("Sandbox Mode: Simulating NVIDIA NIM reranking.")
            # In sandbox mode, mock the logit scores
            for i, doc in enumerate(documents):
                doc["nim_relevance_score"] = 5.0 - (i * 0.5)
            return documents[:top_n]

        passages = [{"text": doc["metadata"].get("text", doc.get("body_text", ""))} for doc in documents]
        
        payload = {
            "model": self.model,
            "query": {"text": query},
            "passages": passages,
            "truncate": "END"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.url, 
                headers=self.headers, 
                json=payload,
                timeout=8.0
            )
            response.raise_for_status()
            result = response.json()
            
            # Map index returned by NIM back to our original document list
            reranked_docs = []
            rankings = result.get("rankings", [])
            
            for ranking in rankings[:top_n]:
                original_index = ranking["index"]
                if original_index < len(documents):
                    doc = documents[original_index]
                    doc["nim_relevance_score"] = ranking.get("logit", 0.0)
                    reranked_docs.append(doc)
                    
            return reranked_docs
