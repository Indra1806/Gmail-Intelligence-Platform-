import json
import logging
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
            self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def draft_email(self, request: ComposeRequest) -> DraftEmailResponse:
        if self.sandbox:
            logger.info("Sandbox Mode: Simulating email draft composition.")
            sign_off = request.sender_name or "Best regards,"
            
            # Simple custom content rules to make mock responses look relevant
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
        
        # Enforce JSON output schema
        response = await self.model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=DraftEmailResponse
            )
        )
        
        result_dict = json.loads(response.text)
        return DraftEmailResponse(**result_dict)
