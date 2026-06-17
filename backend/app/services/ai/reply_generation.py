import logging
import google.generativeai as genai
from app.core.config import settings
from app.services.ai.prompts import THREAD_REPLY_PROMPT

logger = logging.getLogger(__name__)

class ReplyGenerationService:
    def __init__(self):
        self.sandbox = False
        if not self.sandbox:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            # Use gemini-2.0-flash for reply generation
            self.model = genai.GenerativeModel('gemini-2.0-flash')

    async def generate_reply(self, user_instruction: str, reply_to_email: str, thread_history: str) -> str:
        if self.sandbox:
            logger.info("Sandbox Mode: Simulating thread-aware reply.")
            return (
                f"Hi,\n\n"
                f"Thanks for reaching out. In response to your query and our conversation history:\n"
                f"\"{user_instruction}\"\n\n"
                f"Please let me know if you need any additional information.\n\n"
                f"Best regards,\nInbox Assistant"
            )

        prompt = THREAD_REPLY_PROMPT.format(
            user_instruction=user_instruction,
            reply_to_email=reply_to_email,
            thread_history=thread_history[:100000] # Truncate history if extremely large
        )
        
        response = await self.model.generate_content_async(prompt)
        return response.text.strip()
