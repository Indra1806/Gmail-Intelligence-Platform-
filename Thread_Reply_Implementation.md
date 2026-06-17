![BANNER](image.png)


# Thread-Aware Email Reply System: Implementation

I've designed the Thread-Aware Reply System. The hardest challenge in this requirement isn't generating the text—it's correctly manipulating RFC 2822 email headers (`In-Reply-To` and `References`) so that Gmail successfully groups the AI-generated reply into the existing conversation thread.

## 1. Context Collection Logic

Before we generate a reply, we must extract the entire history of the thread and format it chronologically so the LLM understands the full context arc.

```python
# backend/app/services/thread_context_service.py

from app.repositories.email_repo import EmailRepository

class ThreadContextService:
    def __init__(self, email_repo: EmailRepository):
        self.email_repo = email_repo

    async def build_thread_context(self, thread_id: str) -> dict:
        # Fetch all emails in the thread, ordered oldest to newest
        emails = await self.email_repo.get_by_thread_id(thread_id, order_by="received_at ASC")
        
        if not emails:
            raise ValueError("Thread not found or empty.")

        # Build chronological timeline for the LLM
        history_blocks = []
        message_ids = []
        last_message = emails[-1] # The message we are directly replying to
        
        for email in emails:
            # Gmail uses the format <id@mail.gmail.com> for RFC 2822 Message-ID headers.
            # We must collect these to build the 'References' header later.
            message_ids.append(email.gmail_message_id) 
            
            block = f"--- On {email.received_at.strftime('%Y-%m-%d %H:%M')}, {email.from_email} wrote ---\n{email.body_text}"
            history_blocks.append(block)

        return {
            "thread_subject": last_message.subject,
            "reply_to_email": last_message.from_email,
            "llm_context_string": "\n\n".join(history_blocks),
            "last_message_id": last_message.gmail_message_id,
            "all_message_ids": message_ids
        }
```

---

## 2. Prompt Strategy & Thread Understanding

We pass the formatted chronological history to Gemini, along with the user's specific instructions.

```python
# backend/app/services/ai/prompts.py

THREAD_REPLY_PROMPT = """
You are an expert executive communication assistant.
Your task is to draft a reply to an ongoing email thread based on the user's short instruction.

User's Instruction for the Reply: {user_instruction}
Replying To: {reply_to_email}

Conversation History (Chronological):
{thread_history}

Rules for the Reply:
1. Demonstrate full context awareness. If the user says "tell them yes", you must understand what "yes" refers to based on the Conversation History.
2. Do not contradict previous statements made by the user in the thread.
3. Maintain the established tone of the conversation (e.g., if the thread is highly formal, respond formally).
4. Do NOT include a Subject line in your output. Output ONLY the email body.
5. Include a professional sign-off.
"""
```

---

## 3. Reply Generation Service

```python
# backend/app/services/ai/reply_generation.py

import google.generativeai as genai
from app.core.config import settings
from app.services.ai.prompts import THREAD_REPLY_PROMPT

class ReplyGenerationService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY.get_secret_value())
        # We use Gemini 1.5 Pro for replies. Because it requires understanding deep context 
        # and nuances across a long thread, Pro yields significantly better results than Flash here.
        self.model = genai.GenerativeModel('gemini-1.5-pro')

    async def generate_reply(self, user_instruction: str, reply_to_email: str, thread_history: str) -> str:
        prompt = THREAD_REPLY_PROMPT.format(
            user_instruction=user_instruction,
            reply_to_email=reply_to_email,
            thread_history=thread_history[:100000] # Truncate for safety
        )
        
        response = await self.model.generate_content_async(prompt)
        return response.text.strip()
```

---

## 4. Gmail Send Logic (Preserving Thread Grouping)

This is the critical execution step. For Gmail to visually group the sent email into the same thread as the original messages, two things must happen:
1. The API call must include the `threadId` parameter.
2. The raw MIME message must contain `In-Reply-To` and `References` headers matching the RFC 2822 specifications.

```python
# backend/app/services/gmail_send_service.py

import base64
from email.message import EmailMessage
from app.services.gmail_service import GmailAuthWrapper # Custom wrapper from earlier

class GmailSendService:
    def __init__(self, auth_wrapper: GmailAuthWrapper):
        self.auth = auth_wrapper

    async def send_thread_reply(
        self, 
        account_id: str, 
        gmail_thread_id: str, 
        to_email: str, 
        subject: str, 
        body: str, 
        last_message_id: str, 
        all_message_ids: list[str]
    ):
        service = await self.auth.get_client(account_id)
        
        # 1. Construct the raw MIME Email Message
        message = EmailMessage()
        message.set_content(body)
        message['To'] = to_email
        
        # Ensure subject starts with 'Re: ' if it doesn't already
        clean_subject = subject if subject.lower().startswith('re:') else f"Re: {subject}"
        message['Subject'] = clean_subject
        
        # 2. Inject Thread Preservation Headers (CRITICAL)
        # In-Reply-To points specifically to the exact message we hit "reply" on
        message['In-Reply-To'] = last_message_id
        
        # References contains a space-separated list of ALL previous message IDs in the thread
        message['References'] = " ".join(all_message_ids)

        # 3. Base64 URL encode the raw message
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        create_message = {
            'raw': encoded_message,
            'threadId': gmail_thread_id # Tell Gmail API explicitly which thread this belongs to
        }

        # 4. Send via Gmail API
        try:
            sent_message = service.users().messages().send(
                userId='me', 
                body=create_message
            ).execute()
            
            return sent_message
        except Exception as e:
            raise RuntimeError(f"Failed to send reply via Gmail API: {str(e)}")
```

---

## 5. FastAPI Orchestration

Tying it all together in the route.

```python
# backend/app/api/routes/reply.py

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.thread_context_service import ThreadContextService
from app.services.ai.reply_generation import ReplyGenerationService
from app.services.gmail_send_service import GmailSendService

router = APIRouter()

class ReplyRequest(BaseModel):
    account_id: str
    thread_id: str
    user_instruction: str

@router.post("/threads/reply")
async def draft_and_send_reply(
    request: ReplyRequest,
    context_svc: ThreadContextService = Depends(),
    ai_svc: ReplyGenerationService = Depends(),
    send_svc: GmailSendService = Depends()
):
    # 1. Gather Context & Headers
    context = await context_svc.build_thread_context(request.thread_id)
    
    # 2. Generate Reply
    reply_body = await ai_svc.generate_reply(
        user_instruction=request.user_instruction,
        reply_to_email=context["reply_to_email"],
        thread_history=context["llm_context_string"]
    )
    
    # 3. Send via Gmail
    result = await send_svc.send_thread_reply(
        account_id=request.account_id,
        gmail_thread_id=request.thread_id,  # Our DB thread_id and Gmail's are kept in sync
        to_email=context["reply_to_email"],
        subject=context["thread_subject"],
        body=reply_body,
        last_message_id=context["last_message_id"],
        all_message_ids=context["all_message_ids"]
    )
    
    return {"status": "Reply sent successfully", "gmail_response": result}
```
