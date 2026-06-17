![BANNER](image.png)


# Email Summarization System: AI Implementation

I've designed this summarization system taking full advantage of the Gemini API. 

## 1. Architectural Strategy: Chunking & Context

### The Gemini 1.5 Advantage
Most traditional LLMs (like Llama 3 or older GPT models) require complex Map-Reduce chunking (e.g., using LangChain's `RecursiveCharacterTextSplitter`) because they have small context windows (4k - 8k tokens). 

**Gemini 1.5 Flash has a native 1-million-token context window.** 
Therefore, our "Chunking Strategy" is radically simplified:
*   **Strategy:** We do not chunk unless the email exceeds 100,000 characters (purely as a cost/safety threshold). For 99.9% of emails and threads, we pass the entire text directly to Gemini 1.5 Flash.
*   **Context Preservation:** When summarizing a thread, we do *not* summarize each email in isolation and combine them. Instead, we feed the entire chronological thread into Gemini in one prompt. This guarantees perfect context preservation (e.g., understanding that "Yes, let's do it" refers to a proposal 3 emails ago).

---

## 2. Prompt Templates

```python
# backend/app/services/ai/prompts.py

SINGLE_EMAIL_SUMMARY_PROMPT = """
You are an AI assistant helping a busy executive manage their inbox.
Analyze the following email and provide a concise summary.

Rules:
1. Keep the summary under 3 sentences.
2. Highlight any actionable items or deadlines.
3. If it's a newsletter, summarize the top 2 key topics.

Email Subject: {subject}
Sender: {sender}

Email Body:
{email_body}

Summary:
"""

THREAD_SUMMARY_PROMPT = """
You are analyzing an email thread. Below is the chronological history of the conversation.
Provide a comprehensive summary of the entire thread.

Rules:
1. Explain the main topic or objective of the conversation.
2. Summarize the final conclusion or current state of the thread.
3. List any pending action items and who is responsible for them.

Thread Subject: {subject}
Participants: {participants}

Conversation History:
{thread_history}

Thread Summary:
"""
```

---

## 3. Summarization Pipeline & Service

This FastAPI service handles both single emails and full threads.

```python
# backend/app/services/ai/summarization.py

import google.generativeai as genai
from app.core.config import settings
from app.services.ai.prompts import SINGLE_EMAIL_SUMMARY_PROMPT, THREAD_SUMMARY_PROMPT

class SummarizationService:
    def __init__(self):
        # We use Gemini 1.5 Flash for summarization: it's fast and extremely cheap.
        genai.configure(api_key=settings.GEMINI_API_KEY.get_secret_value())
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Safety threshold to prevent massive unexpected costs
        self.MAX_CHARS = 100000 

    def _truncate_text(self, text: str) -> str:
        """Fallback chunking strategy: truncation for safety."""
        if len(text) > self.MAX_CHARS:
            return text[:self.MAX_CHARS] + "\n\n...[TRUNCATED FOR LENGTH]"
        return text

    async def summarize_email(self, subject: str, sender: str, body: str) -> str:
        safe_body = self._truncate_text(body)
        prompt = SINGLE_EMAIL_SUMMARY_PROMPT.format(
            subject=subject,
            sender=sender,
            email_body=safe_body
        )
        
        response = await self.model.generate_content_async(prompt)
        return response.text.strip()

    async def summarize_thread(self, subject: str, participants: list[str], messages: list[dict]) -> str:
        """
        Messages should be ordered chronologically.
        messages = [{"sender": "a@b.com", "body": "...", "date": "..."}]
        """
        # Context Preservation: Build a unified timeline string
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
```

---

## 4. Database Storage Logic

How we integrate the AI service with our Repositories to store the generated summaries efficiently.

```python
# backend/app/services/email_processing_service.py

from app.repositories.email_repo import EmailRepository
from app.repositories.thread_repo import ThreadRepository
from app.services.ai.summarization import SummarizationService

class EmailProcessingService:
    def __init__(self, email_repo: EmailRepository, thread_repo: ThreadRepository, ai: SummarizationService):
        self.email_repo = email_repo
        self.thread_repo = thread_repo
        self.ai = ai

    async def process_new_email(self, email_id: str):
        # 1. Fetch raw email
        email = await self.email_repo.get_by_id(email_id)
        if not email or email.summary:
            return # Already processed

        # 2. Generate Single Email Summary
        summary = await self.ai.summarize_email(
            subject=email.subject,
            sender=email.from_email,
            body=email.body_text or email.body_html
        )
        
        # 3. Store Email Summary
        await self.email_repo.update(email_id, {"summary": summary})

        # 4. Handle Thread Context
        thread_id = email.thread_id
        all_thread_emails = await self.email_repo.get_by_thread_id(thread_id, order_by="received_at ASC")
        
        # Only re-summarize the thread if there's more than 1 email
        if len(all_thread_emails) > 1:
            participants = list(set([e.from_email for e in all_thread_emails]))
            messages = [
                {"sender": e.from_email, "body": e.body_text, "date": str(e.received_at)} 
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
```

---

## 5. FastAPI Route

The endpoint that can trigger this manually (though typically called via background worker after sync).

```python
# backend/app/api/routes/summarize.py

from fastapi import APIRouter, Depends, BackgroundTasks
from app.services.email_processing_service import EmailProcessingService
from app.api.dependencies import get_email_processing_service

router = APIRouter()

@router.post("/emails/{email_id}/summarize")
async def trigger_summarization(
    email_id: str,
    background_tasks: BackgroundTasks,
    processing_service: EmailProcessingService = Depends(get_email_processing_service)
):
    # Enqueue to run in background so UI isn't blocked
    background_tasks.add_task(processing_service.process_new_email, email_id)
    return {"status": "Summarization queued", "email_id": email_id}
```
