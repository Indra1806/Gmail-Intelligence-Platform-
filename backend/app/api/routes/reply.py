import logging
from fastapi import APIRouter, Depends, HTTPException
from app.models.domain import ReplyRequest
from app.services.thread_context_service import ThreadContextService
from app.services.ai.reply_generation import ReplyGenerationService
from app.services.gmail_send_service import GmailSendService
from app.api.dependencies import get_reply_generation_service, get_gmail_send_service, get_email_repo, get_thread_repo

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/reply")
async def send_reply(
    request: ReplyRequest,
    ai_svc: ReplyGenerationService = Depends(get_reply_generation_service),
    send_svc: GmailSendService = Depends(get_gmail_send_service),
    email_repo = Depends(get_email_repo),
    thread_repo = Depends(get_thread_repo)
):
    """Generates and sends a thread-aware response back to Gmail while maintaining thread grouping."""
    try:
        # Resolve services
        context_svc = ThreadContextService(email_repo)
        
        # 1. Build context blocks & fetch RFC headers
        context = await context_svc.build_thread_context(request.thread_id)
        
        # 2. Call LLM to generate reply body
        reply_body = await ai_svc.generate_reply(
            user_instruction=request.user_instruction,
            reply_to_email=context["reply_to_email"],
            thread_history=context["llm_context_string"]
        )
        
        # 3. Transmit reply back to Gmail API
        thread = await thread_repo.get_by_id(request.thread_id)
        if not thread:
            raise ValueError(f"No synchronized thread found for id {request.thread_id}")
        gmail_thread_id = thread["gmail_thread_id"]

        result = await send_svc.send_thread_reply(
            account_id=request.account_id,
            gmail_thread_id=gmail_thread_id,
            to_email=context["reply_to_email"],
            subject=context["thread_subject"],
            body=reply_body,
            last_message_id=context["last_message_id"],
            all_message_ids=context["all_message_ids"]
        )
        
        return {
            "status": "Reply sent successfully",
            "sent_body": reply_body,
            "gmail_response": result
        }
    except Exception as e:
        logger.error(f"Thread reply pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to draft or send thread reply: {str(e)}")
