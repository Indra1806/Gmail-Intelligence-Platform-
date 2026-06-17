import json
import logging
import re
import google.generativeai as genai
from app.core.config import settings
from app.services.ai.prompts import COMPOSE_EMAIL_PROMPT
from app.models.domain import ComposeRequest, DraftEmailResponse

logger = logging.getLogger(__name__)

class CompositionService:
    def __init__(self):
        self.sandbox = False
        if not self.sandbox:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-2.0-flash')

    async def draft_email(self, request: ComposeRequest) -> DraftEmailResponse:
        if self.sandbox:
            logger.info("Sandbox Mode: Simulating email draft composition.")
            sign_off = request.sender_name or "Best regards,"
            subject = f"Draft [{request.tone}]: Action Required"
            body = (
                f"Dear team,\n\n"
                f"Regarding the request: '{request.user_prompt}'.\n"
                f"We are moving forward on this item as planned. Please let me know if there are any immediate concerns.\n\n"
                f"{sign_off}"
            )
            return DraftEmailResponse(subject=subject, body=body)

        prompt = COMPOSE_EMAIL_PROMPT.format(
            user_prompt=request.user_prompt,
            tone=request.tone,
            sender_name=request.sender_name or "Best regards,"
        )

        # Ask the model to output strict JSON with subject and body fields
        json_prompt = (
            prompt
            + "\n\nIMPORTANT: Respond ONLY with a valid JSON object in this exact format, no markdown, no extra text:\n"
            + '{"subject": "<email subject>", "body": "<full email body>"}'
        )

        try:
            response = await self.model.generate_content_async(json_prompt)
            raw = response.text.strip()

            # Strip markdown code fences if present
            raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'```\s*$', '', raw, flags=re.MULTILINE).strip()

            result_dict = json.loads(raw)
            return DraftEmailResponse(**result_dict)
        except Exception as e:
            logger.error(f"Composition service failed: {e}")
            raise
