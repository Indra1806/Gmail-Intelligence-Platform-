import uuid
from datetime import datetime, timezone
from app.repositories.base_repo import BaseRepository

class EmailRepository(BaseRepository):
    async def get_by_id(self, email_id: str):
        response = self.db.table("emails").select("*").eq("id", email_id).execute()
        if response.data:
            class EmailWrapper(dict):
                def __getattr__(self, name):
                    if name in self:
                        return self[name]
                    raise AttributeError(f"No attribute {name}")
            return EmailWrapper(response.data[0])
        return None

    async def get_by_thread_id(self, thread_id: str, order_by: str = "received_at ASC"):
        field, direction = order_by.split()
        desc = direction.upper() == "DESC"
        response = self.db.table("emails")\
            .select("*")\
            .eq("thread_id", thread_id)\
            .order(field, desc=desc)\
            .execute()
            
        class EmailWrapper(dict):
            def __getattr__(self, name):
                if name in self:
                    return self[name]
                raise AttributeError(f"No attribute {name}")
        return [EmailWrapper(r) for r in response.data]

    async def create_or_update(self, email_data: dict):
        account_id = email_data["account_id"]
        gmail_message_id = email_data["gmail_message_id"]
        
        response = self.db.table("emails")\
            .select("id")\
            .eq("account_id", account_id)\
            .eq("gmail_message_id", gmail_message_id)\
            .execute()
        existing_id = response.data[0]["id"] if response.data else None
                
        now = datetime.now(timezone.utc)
        email_data["updated_at"] = now.isoformat()
        
        if existing_id:
            response = self.db.table("emails").update(email_data).eq("id", existing_id).execute()
            return response.data[0]
        else:
            new_id = str(uuid.uuid4())
            email_data["id"] = new_id
            email_data["created_at"] = now.isoformat()
            response = self.db.table("emails").insert(email_data).execute()
            return response.data[0]

    async def update(self, email_id: str, update_data: dict):
        now = datetime.now(timezone.utc)
        update_data["updated_at"] = now.isoformat()
        response = self.db.table("emails").update(update_data).eq("id", email_id).execute()
        return response.data[0] if response.data else None

    async def get_all_emails_by_account(self, account_id: str, category: str | None = None):
        query = self.db.table("emails").select("*").eq("account_id", account_id)
        if category and category.lower() != "all":
            query = query.eq("category", category)
        response = query.order("received_at", desc=True).execute()
        return response.data

    async def save_embeddings(self, embeddings_list: list[dict]):
        response = self.db.table("email_embeddings").insert(embeddings_list).execute()
        return response.data

    async def vector_search(self, account_id: str, embedding: list[float], limit: int = 15) -> list[dict]:
        # Call database match_emails RPC
        response = self.db.rpc(
            "match_emails",
            {
                "query_embedding": embedding,
                "match_limit": limit,
                "filter_account_id": account_id
            }
        ).execute()
        
        # Format database output
        formatted_results = []
        for row in response.data:
            # Parse datetime string
            dt = datetime.fromisoformat(row["received_at"].replace("Z", "+00:00"))
            formatted_results.append({
                "email_id": row["email_id"],
                "thread_id": row["thread_id"],
                "gmail_message_id": row["gmail_message_id"],
                "subject": row["subject"],
                "from_email": row["from_email"],
                "body_text": row["body_text"],
                "received_at": dt,
                "distance": row["distance"],
                "metadata": row["metadata"]
            })
        return formatted_results
