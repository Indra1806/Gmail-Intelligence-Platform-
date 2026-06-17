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
            self.model = genai.GenerativeModel('gemini-1.5-flash')

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
        
        try:
            # Enforce JSON output schema
            response = await self.model.generate_content_async(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=EmailClassificationResult
                )
            )
            result_dict = json.loads(response.text)
            return EmailClassificationResult(**result_dict)
            
        except Exception as e:
            logger.error(f"Gemini classification failed: {e}")
            return EmailClassificationResult(
                category="Uncategorized",
                confidence=0.0,
                explanation=f"Classification failed: {str(e)}"
            )
