import logging
from app.services.ai.embeddings import EmbeddingService
from app.services.ai.nim_reranker import NIMRerankingService
from app.repositories.email_repo import EmailRepository

logger = logging.getLogger(__name__)

class RobustRAGRetriever:
    def __init__(
        self, 
        email_repo: EmailRepository, 
        embedder: EmbeddingService, 
        nim_reranker: NIMRerankingService
    ):
        self.repo = email_repo
        self.embedder = embedder
        self.nim = nim_reranker

    async def retrieve_context(self, account_id: str, query: str, top_k: int = 10) -> list[dict]:
        """Runs hybrid vector search + NIM Cross-Encoder Reranking with keyword fallback."""
        # 1. Embed user query
        query_vector = await self.embedder.embed_text(query)
        
        # 2. Retrieve top candidate chunks (over-fetch by factor of 3 for reranking)
        raw_candidates = await self.repo.vector_search(
            account_id=account_id,
            embedding=query_vector,
            limit=top_k * 3
        )
        
        # Filter out chunks with poor similarity (distance > 0.65)
        MAX_COSINE_DISTANCE = 0.65
        filtered_candidates = [
            c for c in raw_candidates 
            if c.get("distance", 1.0) <= MAX_COSINE_DISTANCE
        ]
        
        if not filtered_candidates:
            logger.info("No vector candidates passed threshold — falling back to keyword search.")
            # Extract meaningful words from the query to use as a keyword
            keyword = query.strip()
            keyword_results = await self.repo.search_by_keyword(account_id, keyword)
            if not keyword_results:
                # Try first significant word if full query returns nothing
                words = [w for w in query.split() if len(w) > 3]
                for word in words:
                    keyword_results = await self.repo.search_by_keyword(account_id, word)
                    if keyword_results:
                        break
            if not keyword_results:
                logger.info(f"No emails matched keyword query '{keyword}' for account {account_id}.")
                return []
            # Format keyword results to match vector search result schema
            formatted = []
            for row in keyword_results[:top_k]:
                formatted.append({
                    "email_id": row.get("id"),
                    "thread_id": row.get("thread_id"),
                    "gmail_message_id": row.get("gmail_message_id"),
                    "subject": row.get("subject", ""),
                    "from_email": row.get("from_email", ""),
                    "body_text": row.get("body_text", ""),
                    "received_at": row.get("received_at"),
                    "distance": 0.0,
                    "metadata": {"text": row.get("body_text", "")}
                })
            logger.info(f"Keyword search returned {len(formatted)} results for '{keyword}'.")
            return formatted

        # 3. Apply NVIDIA NIM Reranking
        try:
            logger.info(f"Sending {len(filtered_candidates)} candidates to NVIDIA NIM Cross-Encoder...")
            reranked = await self.nim.rerank_documents(query, filtered_candidates, top_n=top_k)
            return reranked
        except Exception as e:
            # Fallback logic: standard cosine similarity
            logger.warning(f"NVIDIA NIM reranking failed ({e}). Falling back to standard pgvector cosine distance.")
            return filtered_candidates[:top_k]
