import logging
import google.generativeai as genai
from app.core.config import settings
from app.services.ai.prompts import SINGLE_EMAIL_SUMMARY_PROMPT, THREAD_SUMMARY_PROMPT

logger = logging.getLogger(__name__)

class SummarizationService:
    def __init__(self):
        self.sandbox = False
        if not self.sandbox:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.MAX_CHARS = 100000

    def _truncate_text(self, text: str) -> str:
        if len(text) > self.MAX_CHARS:
            return text[:self.MAX_CHARS] + "\n\n...[TRUNCATED FOR LENGTH]"
        return text

    async def summarize_email(self, subject: str, sender: str, body: str) -> str:
        if self.sandbox:
            logger.info("Sandbox Mode: Simulating single email summary.")
            return f"[AI Summary] Action needed. A request regarding '{subject}' from {sender} was received. Deadline: ASAP."

        try:
            safe_body = self._truncate_text(body)
            prompt = SINGLE_EMAIL_SUMMARY_PROMPT.format(
                subject=subject,
                sender=sender,
                email_body=safe_body
            )
            # Run in executor or call async if available
            response = await self.model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini email summarization failed: {e}")
            return f"[Fallback Summary] Failed to generate AI summary: {str(e)}"

    async def summarize_thread(self, subject: str, participants: list[str], messages: list[dict]) -> str:
        if self.sandbox:
            logger.info("Sandbox Mode: Simulating thread summary.")
            return f"[AI Thread Summary] Discussion with {', '.join(participants)} regarding '{subject}'. Action items: Confirm details."

        try:
            history_blocks = []
            for msg in messages:
                block = f"--- On {msg['date']}, {msg['sender']} wrote ---\n{msg['body']}"
                history_blocks.append(block)
                
            thread_history = "\n\n".join(history_blocks)
            safe_history = self._truncate_text(thread_history)
            
            prompt = THREAD_SUMMARY_PROMPT.format(
                subject=subject,
                participants=", ".join(participants),
                thread_history=safe_history
            )
            
            response = await self.model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini thread summarization failed: {e}")
            return f"[Fallback Thread Summary] Failed to generate AI thread summary: {str(e)}"
