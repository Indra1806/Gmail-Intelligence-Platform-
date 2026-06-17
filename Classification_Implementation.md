<!-- OVO.AI Banner -->
<p align="center">
  <img src="image.png" alt="OVO.AI Banner" width="100%" style="border-radius:8px;"/>
</p>


# Email Classification System: AI Implementation

While our initial roadmap suggested using NVIDIA NIM for categorization, you explicitly requested the **Gemini API** here. This is actually a fantastic choice because Gemini 1.5 Flash supports **Strict JSON Output** via `response_schema`, ensuring our pipeline never breaks due to malformed string parsing.

## 1. Database Schema Additions

To support Confidence Scores and Category Explanations, we must slightly augment our `emails` table.

```sql
-- Additions to the 'emails' table (from 001_initial_schema.sql)
ALTER TABLE emails 
ADD COLUMN category TEXT CHECK (category IN ('Newsletter', 'Job', 'Finance', 'Notification', 'Personal', 'Work', 'Uncategorized')),
ADD COLUMN category_confidence NUMERIC(3,2), -- e.g., 0.95
ADD COLUMN category_explanation TEXT;
```

---

## 2. Pydantic Models & Gemini Schema

By enforcing a Pydantic schema natively in the Gemini API call, we guarantee the AI returns a valid, typed JSON object.

```python
# backend/app/models/domain.py

from pydantic import BaseModel, Field
from typing import Literal

CategoryType = Literal['Newsletter', 'Job', 'Finance', 'Notification', 'Personal', 'Work', 'Uncategorized']

class EmailClassificationResult(BaseModel):
    category: CategoryType = Field(description="The assigned category for the email.")
    confidence: float = Field(description="A confidence score between 0.0 and 1.0.")
    explanation: str = Field(description="A 1-sentence explanation of why this category was chosen.")
```

---

## 3. Classification Prompt

```python
# backend/app/services/ai/prompts.py

EMAIL_CLASSIFICATION_PROMPT = """
You are a highly accurate email classification system.
Analyze the following email and categorize it into exactly one of the permitted categories.

Permitted Categories:
1. Newsletter - Subscription-based content, digests, marketing updates
2. Job - Applications, offers, rejections, interview requests
3. Finance - Invoices, receipts, bank alerts, payments
4. Notification - System alerts, OTPs, platform updates, password resets
5. Personal - Direct human-to-human communication with friends/family
6. Work - Project discussions, team communication, professional networking

Rules:
- Provide a confidence score between 0.0 and 1.0.
- Provide a brief 1-sentence explanation for your decision.
- Rely heavily on the sender email address and the subject line, as they are strong indicators (e.g., 'no-reply@bank.com' -> Finance).

Sender: {sender}
Subject: {subject}
Body Snippet: {snippet}
"""
```

---

## 4. Processing Pipeline Service

This service wraps the Gemini call and handles the strict JSON output constraint.

```python
# backend/app/services/ai/classification.py

import json
import google.generativeai as genai
from app.core.config import settings
from app.services.ai.prompts import EMAIL_CLASSIFICATION_PROMPT
from app.models.domain import EmailClassificationResult

class ClassificationService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY.get_secret_value())
        # Using Gemini 1.5 Flash for high-speed, low-latency classification
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def classify_email(self, sender: str, subject: str, snippet: str) -> EmailClassificationResult:
        prompt = EMAIL_CLASSIFICATION_PROMPT.format(
            sender=sender, 
            subject=subject, 
            snippet=snippet[:1000] # We only need the first 1000 chars for classification
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
            
            # Parse the guaranteed JSON string into our Pydantic model
            result_dict = json.loads(response.text)
            return EmailClassificationResult(**result_dict)
            
        except Exception as e:
            # Graceful degradation: If AI fails, fallback to Uncategorized
            return EmailClassificationResult(
                category="Uncategorized",
                confidence=0.0,
                explanation=f"Classification failed: {str(e)}"
            )
```

---

## 5. FastAPI Implementation & Database Storage

This endpoint accepts an email ID, runs the classification, and persists the result, including confidence and explanation, to Supabase.

```python
# backend/app/api/routes/classification.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.services.ai.classification import ClassificationService
from app.repositories.email_repo import EmailRepository
from app.api.dependencies import get_classification_service, get_email_repo

router = APIRouter()

async def process_classification(email_id: str, ai: ClassificationService, repo: EmailRepository):
    email = await repo.get_by_id(email_id)
    if not email:
        return

    # Call Gemini API
    result = await ai.classify_email(
        sender=email.from_email,
        subject=email.subject,
        snippet=email.snippet or email.body_text
    )

    # Persist to Database
    await repo.update(email_id, {
        "category": result.category,
        "category_confidence": result.confidence,
        "category_explanation": result.explanation
    })

@router.post("/emails/{email_id}/classify")
async def trigger_classification(
    email_id: str,
    background_tasks: BackgroundTasks,
    ai: ClassificationService = Depends(get_classification_service),
    repo: EmailRepository = Depends(get_email_repo)
):
    # Verify email exists before queuing
    email = await repo.get_by_id(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    # Queue the classification task
    background_tasks.add_task(process_classification, email_id, ai, repo)
    
    return {
        "status": "Classification queued", 
        "email_id": email_id
    }
```

---

## 6. Error Handling Strategy

1. **Schema Failures:** By using Gemini's `response_schema`, we mathematically eliminate the possibility of the LLM returning a string like "I think this is Finance" instead of JSON. The output is guaranteed to parse.
2. **Timeout / Quota Limits:** The `try/except` block in `ClassificationService` catches API timeouts or `429 Too Many Requests`.
3. **Graceful Degradation:** If an error occurs, the system catches it and returns a valid Pydantic model with `category="Uncategorized"` and `confidence=0.0`. This ensures the database update still runs, marking the email so it doesn't get stuck in a perpetual classification loop, but clearly denoting that AI processing failed.
