import json
import logging
import google.generativeai as genai
from app.core.config import settings
from app.services.ai.prompts import EMAIL_CLASSIFICATION_PROMPT
from app.models.domain import EmailClassificationResult

logger = logging.getLogger(__name__)

class ClassificationService:
    def __init__(self):
        self.sandbox = False
        if not self.sandbox:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-2.0-flash')

    async def classify_email(self, sender: str, subject: str, snippet: str) -> EmailClassificationResult:
        if self.sandbox:
            logger.info("Sandbox Mode: Simulating email classification.")
            text = f"{subject} {snippet}".lower()
            
            if any(k in text for k in ["digest", "newsletter", "weekly", "monthly", "subscribe"]):
                return EmailClassificationResult(category="Newsletter", confidence=0.9, explanation="Subject contains digest/newsletter subscription triggers.")
            elif any(k in text for k in ["invoice", "receipt", "payment", "bill", "finance", "credit", "charge"]):
                return EmailClassificationResult(category="Finance", confidence=0.95, explanation="Identified payment/invoice triggers in communication.")
            elif any(k in text for k in ["interview", "job", "offer", "resume", "rejection", "application"]):
                return EmailClassificationResult(category="Job", confidence=0.92, explanation="Subject concerns job application or interview scheduling.")
            elif any(k in text for k in ["otp", "verification", "code", "alert", "password", "security", "reset"]):
                return EmailClassificationResult(category="Notification", confidence=0.98, explanation="Identified automated security/system notifications.")
            elif any(k in text for k in ["mom", "dad", "dinner", "hey", "plans", "hello", "weekend"]):
                return EmailClassificationResult(category="Personal", confidence=0.85, explanation="Informal conversational wording indicates personal content.")
            else:
                return EmailClassificationResult(category="Work", confidence=0.88, explanation="Professional wording regarding timelines and deliverables.")

        prompt = EMAIL_CLASSIFICATION_PROMPT.format(
            sender=sender, 
            subject=subject, 
            snippet=snippet[:1000]
        )
        
        json_prompt = (
            prompt
            + "\n\nIMPORTANT: Respond ONLY with valid JSON in this exact format, no markdown:\n"
            + '{"category": "<one of the permitted categories>", "confidence": <0.0-1.0>, "explanation": "<one sentence>"}'
        )
        try:
            import re
            response = await self.model.generate_content_async(json_prompt)
            raw = response.text.strip()
            # Strip markdown code fences if present
            raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'```\s*$', '', raw, flags=re.MULTILINE).strip()
            result_dict = json.loads(raw)
            return EmailClassificationResult(**result_dict)
            
        except Exception as e:
            logger.error(f"Gemini classification failed: {e}")
            return EmailClassificationResult(
                category="Uncategorized",
                confidence=0.0,
                explanation=f"Classification failed: {str(e)}"
            )
