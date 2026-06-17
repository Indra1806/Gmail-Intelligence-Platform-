import uuid
from datetime import datetime, timezone
from app.repositories.base_repo import BaseRepository

class ThreadRepository(BaseRepository):
    async def get_by_id(self, thread_id: str):
        response = self.db.table("threads").select("*").eq("id", thread_id).execute()
        return response.data[0] if response.data else None

    async def get_by_gmail_thread_id(self, account_id: str, gmail_thread_id: str):
        response = self.db.table("threads")\
            .select("*")\
            .eq("account_id", account_id)\
            .eq("gmail_thread_id", gmail_thread_id)\
            .execute()
        return response.data[0] if response.data else None

    async def create_or_update(self, thread_data: dict):
        account_id = thread_data["account_id"]
        gmail_thread_id = thread_data["gmail_thread_id"]
        
        existing = await self.get_by_gmail_thread_id(account_id, gmail_thread_id)
        
        now = datetime.now(timezone.utc)
        thread_data["updated_at"] = now.isoformat()
        
        if existing:
            thread_id = existing["id"]
            response = self.db.table("threads").update(thread_data).eq("id", thread_id).execute()
            return response.data[0]
        else:
            thread_id = str(uuid.uuid4())
            thread_data["id"] = thread_id
            thread_data["created_at"] = now.isoformat()
            response = self.db.table("threads").insert(thread_data).execute()
            return response.data[0]

    async def update(self, thread_id: str, update_data: dict):
        now = datetime.now(timezone.utc)
        update_data["updated_at"] = now.isoformat()
        response = self.db.table("threads").update(update_data).eq("id", thread_id).execute()
        return response.data[0] if response.data else None

    async def get_all_threads_by_account(self, account_id: str, category: str | None = None):
        query = self.db.table("threads").select("*").eq("account_id", account_id)
        if category and category.lower() != "all":
            query = query.eq("category", category)
        response = query.order("last_message_at", desc=True).execute()
        return response.data
