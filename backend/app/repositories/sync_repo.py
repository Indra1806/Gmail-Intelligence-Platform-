import uuid
from datetime import datetime, timezone
from app.repositories.base_repo import BaseRepository

class SyncRepository(BaseRepository):
    async def get_state(self, account_id: str):
        response = self.db.table("sync_state").select("*").eq("account_id", account_id).execute()
        return response.data[0] if response.data else None

    async def update_state(self, account_id: str, update_data: dict):
        existing = await self.get_state(account_id)
        now = datetime.now(timezone.utc)
        update_data["last_synced_at"] = now.isoformat()
        
        if existing:
            response = self.db.table("sync_state").update(update_data).eq("account_id", account_id).execute()
            return response.data[0]
        else:
            state_id = str(uuid.uuid4())
            update_data["id"] = state_id
            update_data["account_id"] = account_id
            response = self.db.table("sync_state").insert(update_data).execute()
            return response.data[0]
