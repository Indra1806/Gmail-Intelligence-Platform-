import logging
from app.repositories.email_repo import EmailRepository
from app.repositories.thread_repo import ThreadRepository
from app.services.ai.summarization import SummarizationService

logger = logging.getLogger(__name__)

class EmailProcessingService:
    def __init__(self, email_repo: EmailRepository, thread_repo: ThreadRepository, ai: SummarizationService):
        self.email_repo = email_repo
        self.thread_repo = thread_repo
        self.ai = ai

    async def process_new_email(self, email_id: str):
        """Generates summaries for a new email and updates its thread context."""
        logger.info(f"Generating summaries for email {email_id}...")
        
        # 1. Fetch raw email
        email = await self.email_repo.get_by_id(email_id)
        if not email:
            logger.warning(f"Email {email_id} not found.")
            return

        # 2. Generate Single Email Summary if not already set
        if not email.get("summary") or email.get("summary").startswith("[Fallback"):
            try:
                summary = await self.ai.summarize_email(
                    subject=email.subject,
                    sender=email.from_email,
                    body=email.body_text or email.snippet
                )
                await self.email_repo.update(email_id, {"summary": summary})
            except Exception as e:
                logger.error(f"Failed to generate summary for email {email_id}: {e}")

        # 3. Handle Thread Context summarization
        thread_id = email.thread_id
        all_thread_emails = await self.email_repo.get_by_thread_id(thread_id, order_by="received_at ASC")
        
        # Only re-summarize the thread if there is more than 1 email
        if len(all_thread_emails) >= 1:
            try:
                participants = list(set([e.from_email for e in all_thread_emails]))
                messages = [
                    {"sender": e.from_email, "body": e.body_text or e.snippet, "date": str(e.received_at)} 
                    for e in all_thread_emails
                ]
                
                # Generate Thread Summary
                thread_summary = await self.ai.summarize_thread(
                    subject=email.subject,
                    participants=participants,
                    messages=messages
                )
                
                # Store Thread Summary
                await self.thread_repo.update(thread_id, {"thread_summary": thread_summary})
            except Exception as e:
                logger.error(f"Failed to generate thread summary for thread {thread_id}: {e}")
