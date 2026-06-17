# AI Email Composition Assistant: Implementation

As a Senior LLM Engineer, I have built the composition assistant. The key innovation here is using **Structured JSON Outputs** to guarantee the AI generates both a Subject Line and an Email Body simultaneously, eliminating the need for two separate LLM calls or hacky regex parsing.

## 1. Pydantic Models for Input/Output

We define strict schemas for both the FastAPI request and the Gemini API response.

```python
# backend/app/models/domain.py

from pydantic import BaseModel, Field
from typing import Literal

ToneType = Literal['Professional', 'Casual', 'Urgent', 'Apologetic', 'Persuasive']

class ComposeRequest(BaseModel):
    user_prompt: str = Field(..., description="The short instruction from the user, e.g., 'Tell the team the launch is delayed to Friday.'")
    tone: ToneType = Field(default="Professional", description="The desired tone of the email.")
    sender_name: str | None = Field(default=None, description="The name to sign off the email with.")

class DraftEmailResponse(BaseModel):
    subject: str = Field(description="A concise, compelling subject line for the email.")
    body: str = Field(description="The full formatted body of the email, including salutation and sign-off.")
```

---

## 2. Prompt Engineering & Tone Control

This system prompt explicitly handles tone adjustments and formatting constraints.

```python
# backend/app/services/ai/prompts.py

COMPOSE_EMAIL_PROMPT = """
You are an expert executive communication assistant. 
Your task is to draft a complete, ready-to-send email based on the user's short instructions.

User Instructions: {user_prompt}
Desired Tone: {tone}
Sign-off Name: {sender_name}

Formatting Rules:
1. Include an appropriate salutation (e.g., "Hi Team,", "Dear [Name],") based on context.
2. Organize the body into clear, readable paragraphs.
3. Use bullet points if listing multiple items.
4. Conclude with a professional sign-off using the provided Sign-off Name (or a generic sign-off if none is provided).
5. DO NOT include placeholder brackets like [Company Name] unless absolutely necessary; try to infer context or leave it generic but natural.

Tone Guidelines:
- Professional: Clear, polite, direct, and formal.
- Casual: Friendly, conversational, and relaxed.
- Urgent: Concise, prioritizing the bottom line and immediate action items.
- Apologetic: Empathetic, taking ownership, and focusing on next steps/resolutions.
- Persuasive: Compelling, highlighting benefits, and ending with a strong call to action.
"""
```

---

## 3. Gemini Integration Service

This service executes the prompt and guarantees the output matches `DraftEmailResponse`.

```python
# backend/app/services/ai/composition.py

import json
import google.generativeai as genai
from app.core.config import settings
from app.services.ai.prompts import COMPOSE_EMAIL_PROMPT
from app.models.domain import ComposeRequest, DraftEmailResponse

class CompositionService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY.get_secret_value())
        # Gemini 1.5 Flash is highly capable of standard email drafting and extremely fast.
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def draft_email(self, request: ComposeRequest) -> DraftEmailResponse:
        prompt = COMPOSE_EMAIL_PROMPT.format(
            user_prompt=request.user_prompt,
            tone=request.tone,
            sender_name=request.sender_name or "Best regards,"
        )
        
        # Enforce JSON output matching our DraftEmailResponse schema
        response = await self.model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=DraftEmailResponse
            )
        )
        
        # Parse the JSON string directly into our Pydantic response model
        result_dict = json.loads(response.text)
        return DraftEmailResponse(**result_dict)
```

---

## 4. FastAPI Endpoints

The API endpoint acts as a clean bridge between the frontend and the Composition Service.

```python
# backend/app/api/routes/compose.py

from fastapi import APIRouter, Depends, HTTPException
from app.models.domain import ComposeRequest, DraftEmailResponse
from app.services.ai.composition import CompositionService
from app.api.dependencies import get_composition_service

router = APIRouter()

@router.post("/emails/compose", response_model=DraftEmailResponse)
async def compose_new_email(
    request: ComposeRequest,
    ai: CompositionService = Depends(get_composition_service)
):
    """
    Drafts a new email (Subject + Body) based on a short natural language prompt.
    """
    try:
        draft = await ai.draft_email(request)
        return draft
    except Exception as e:
        # Log the actual error internally (omitted for brevity)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate email draft: {str(e)}"
        )
```

## How It Meets Requirements:
*   **Subject Generation & Formatting:** Guaranteed structurally via the `DraftEmailResponse` JSON schema constraint.
*   **Tone Control:** Enforced through the `ToneType` literal in Pydantic, combined with specific instruction tuning in the system prompt.
*   **Performance:** Uses Gemini 1.5 Flash, which can generate a full email draft in under 1 second, providing a snappy UX for the user.
