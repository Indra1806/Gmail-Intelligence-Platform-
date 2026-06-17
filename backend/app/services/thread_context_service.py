import logging
from app.repositories.email_repo import EmailRepository

logger = logging.getLogger(__name__)

class ThreadContextService:
    def __init__(self, email_repo: EmailRepository):
        self.email_repo = email_repo

    async def build_thread_context(self, thread_id: str) -> dict:
        """Gathers email thread details and chronologically formats them for LLM context."""
        emails = await self.email_repo.get_by_thread_id(thread_id, order_by="received_at ASC")
        
        if not emails:
            raise ValueError(f"Thread {thread_id} not found or has no messages.")

        history_blocks = []
        message_ids = []
        last_message = emails[-1]
        
        for email in emails:
            # Gather Message-IDs for References header
            msg_id = email.get("gmail_message_id")
            if msg_id:
                message_ids.append(msg_id)
                
            formatted_date = email.received_at.strftime('%Y-%m-%d %H:%M') if hasattr(email.received_at, "strftime") else str(email.received_at)
            block = f"--- On {formatted_date}, {email.from_email} wrote ---\n{email.body_text or email.snippet}"
            history_blocks.append(block)

        return {
            "thread_subject": last_message.subject or "(No Subject)",
            "reply_to_email": last_message.from_email,
            "llm_context_string": "\n\n".join(history_blocks),
            "last_message_id": last_message.get("gmail_message_id"),
            "all_message_ids": message_ids
        }
