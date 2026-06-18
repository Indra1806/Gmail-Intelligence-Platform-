import logging
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from app.repositories.email_repo import EmailRepository
from app.repositories.thread_repo import ThreadRepository
from app.services.email_processing_service import EmailProcessingService
from app.services.ai.classification import ClassificationService
from app.api.dependencies import get_email_repo, get_thread_repo, get_email_processing_service, get_classification_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("")
async def get_emails(
    account_id: str = Query(..., description="Gmail account UUID"),
    category: str | None = Query(None, description="Category filter"),
    search: str | None = Query(None, description="Search keyword"),
    repo: EmailRepository = Depends(get_email_repo)
):
    """Fetches list of all synchronized emails matching filter options."""
    try:
        emails = await repo.get_all_emails_by_account(account_id, category, search)
        return emails
    except Exception as e:
        logger.error(f"Error fetching emails: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/threads")
async def get_threads(
    account_id: str = Query(..., description="Gmail account UUID"),
    category: str | None = Query(None, description="Category filter"),
    search: str | None = Query(None, description="Search keyword"),
    repo: ThreadRepository = Depends(get_thread_repo)
):
    """Fetches list of thread records matching filter options."""
    try:
        threads = await repo.get_all_threads_by_account(account_id, category, search)
        return threads
    except Exception as e:
        logger.error(f"Error fetching threads: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/threads/{thread_id}")
async def get_thread_details(
    thread_id: str,
    thread_repo: ThreadRepository = Depends(get_thread_repo),
    email_repo: EmailRepository = Depends(get_email_repo)
):
    """Fetches details of a thread record, including all emails contained inside."""
    thread = await thread_repo.get_by_id(thread_id)
    if not thread:
        # Check if the thread_id parameter is actually an email ID (e.g. from RAG citation click)
        email = await email_repo.get_by_id(thread_id)
        if email:
            thread_id = email.thread_id
            thread = await thread_repo.get_by_id(thread_id)
            
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
        
    emails = await email_repo.get_by_thread_id(thread_id, order_by="received_at ASC")
    
    return {
        "thread": thread,
        "emails": emails
    }


@router.get("/{email_id}")
async def get_email_details(
    email_id: str,
    repo: EmailRepository = Depends(get_email_repo)
):
    """Fetches metadata details for a specific email."""
    email = await repo.get_by_id(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email


@router.post("/{email_id}/summarize")
async def trigger_summarize(
    email_id: str,
    background_tasks: BackgroundTasks,
    repo: EmailRepository = Depends(get_email_repo),
    processing_service: EmailProcessingService = Depends(get_email_processing_service)
):
    """Manually triggers email and thread summarization in a background task."""
    email = await repo.get_by_id(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    background_tasks.add_task(processing_service.process_new_email, email_id)
    return {"status": "Summarization queued", "email_id": email_id}


@router.post("/{email_id}/classify")
async def trigger_classify(
    email_id: str,
    background_tasks: BackgroundTasks,
    repo: EmailRepository = Depends(get_email_repo),
    thread_repo: ThreadRepository = Depends(get_thread_repo),
    ai: ClassificationService = Depends(get_classification_service)
):
    """Manually triggers automated category classification for an email."""
    email = await repo.get_by_id(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    async def process(eid):
        res = await ai.classify_email(
            sender=email.from_email,
            subject=email.subject,
            snippet=email.snippet or email.body_text
        )
        await repo.update(eid, {
            "category": res.category
        })
        await thread_repo.update(email.thread_id, {"category": res.category})

    background_tasks.add_task(process, email_id)
    return {"status": "Classification queued", "email_id": email_id}
