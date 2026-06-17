import uuid
from datetime import datetime, timezone
from app.repositories.base_repo import BaseRepository

class ChatRepository(BaseRepository):
    async def create_session(self, user_id: str, title: str | None = None) -> dict:
        session_id = str(uuid.uuid4())
        session_data = {
            "id": session_id,
            "user_id": user_id,
            "title": title or "New Chat Session",
            "created_at": datetime.now(timezone.utc).isoformat() if not self.sandbox else datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc).isoformat() if not self.sandbox else datetime.now(timezone.utc)
        }
        
        if self.sandbox:
            self.mock.chat_sessions[session_id] = session_data
            return session_data
            
        response = self.db.table("chat_sessions").insert(session_data).execute()
        return response.data[0] if response.data else None

    async def get_sessions_by_user(self, user_id: str) -> list[dict]:
        if self.sandbox:
            sessions = [s for s in self.mock.chat_sessions.values() if s["user_id"] == user_id]
            sessions.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
            return sessions
            
        response = self.db.table("chat_sessions")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        return response.data

    async def get_session_history(self, session_id: str, limit: int = 10) -> list[dict]:
        if self.sandbox:
            history = [m for m in self.mock.chat_messages if m["session_id"] == session_id]
            history.sort(key=lambda x: x.get("created_at", datetime.min))
            
            class MessageWrapper(dict):
                def __getattr__(self, name):
                    if name in self:
                        return self[name]
                    raise AttributeError(f"No attribute {name}")
            return [MessageWrapper(m) for m in history[-limit:]]

        response = self.db.table("chat_messages")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
            
        # Reverse to be chronological
        messages = list(reversed(response.data))
        class MessageWrapper(dict):
            def __getattr__(self, name):
                if name in self:
                    return self[name]
                raise AttributeError(f"No attribute {name}")
        return [MessageWrapper(m) for m in messages]

    async def save_message(self, session_id: str, role: str, content: str, source_emails: list[str]) -> dict:
        msg_id = str(uuid.uuid4())
        msg_data = {
            "id": msg_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "source_emails": source_emails,
            "created_at": datetime.now(timezone.utc).isoformat() if not self.sandbox else datetime.now(timezone.utc)
        }
        
        if self.sandbox:
            self.mock.chat_messages.append(msg_data)
            return msg_data
            
        response = self.db.table("chat_messages").insert(msg_data).execute()
        return response.data[0] if response.data else None
