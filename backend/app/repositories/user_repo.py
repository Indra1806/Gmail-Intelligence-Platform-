import uuid
from datetime import datetime, timezone
from app.repositories.base_repo import BaseRepository
from app.core.security import encrypt_token, decrypt_token
from app.core.config import settings

class UserRepository(BaseRepository):
    async def get_by_email(self, email: str):
        response = self.db.table("users").select("*").eq("email", email).execute()
        return response.data[0] if response.data else None

    async def get_by_id(self, user_id: str):
        response = self.db.table("users").select("*").eq("id", user_id).execute()
        return response.data[0] if response.data else None

    async def create(self, email: str):
        user_id = str(uuid.uuid4())
        user_data = {
            "id": user_id,
            "email": email,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        response = self.db.table("users").insert(user_data).execute()
        return response.data[0] if response.data else None

    async def get_or_create_gmail_account(self, user_id: str, email_address: str, access_token: str, refresh_token: str, expiry: datetime):
        # 1. Encrypt credentials prior to database persistence
        encrypted_access = encrypt_token(access_token, settings.ENCRYPTION_KEY)
        encrypted_refresh = encrypt_token(refresh_token, settings.ENCRYPTION_KEY)

        # 2. Query existing mapping
        response = self.db.table("gmail_accounts")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("email_address", email_address)\
            .execute()
        
        acc_data = {
            "user_id": user_id,
            "email_address": email_address,
            "access_token": encrypted_access,
            "refresh_token": encrypted_refresh,
            "token_expiry": expiry.isoformat() if hasattr(expiry, "isoformat") else expiry,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if response.data:
            acc_id = response.data[0]["id"]
            upd_res = self.db.table("gmail_accounts").update(acc_data).eq("id", acc_id).execute()
            result = upd_res.data[0]
        else:
            acc_data["id"] = str(uuid.uuid4())
            ins_res = self.db.table("gmail_accounts").insert(acc_data).execute()
            result = ins_res.data[0]
            
        # Decrypt credentials for active session use
        result["access_token"] = decrypt_token(result["access_token"], settings.ENCRYPTION_KEY)
        result["refresh_token"] = decrypt_token(result["refresh_token"], settings.ENCRYPTION_KEY)
        return result
            
    async def get_gmail_account(self, account_id: str):
        response = self.db.table("gmail_accounts").select("*").eq("id", account_id).execute()
        if response.data:
            account = response.data[0]
            account["access_token"] = decrypt_token(account["access_token"], settings.ENCRYPTION_KEY)
            account["refresh_token"] = decrypt_token(account["refresh_token"], settings.ENCRYPTION_KEY)
            return account
        return None

    async def get_accounts_by_user(self, user_id: str):
        response = self.db.table("gmail_accounts").select("*").eq("user_id", user_id).execute()
        accounts = response.data
        for account in accounts:
            account["access_token"] = decrypt_token(account["access_token"], settings.ENCRYPTION_KEY)
            account["refresh_token"] = decrypt_token(account["refresh_token"], settings.ENCRYPTION_KEY)
        return accounts
