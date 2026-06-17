import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from pydantic import BaseModel
from app.services.sync_service import SyncService
from app.api.dependencies import get_sync_service

logger = logging.getLogger(__name__)
router = APIRouter()

class SyncRequest(BaseModel):
    account_id: str

@router.post("/trigger")
async def trigger_sync(
    request: SyncRequest,
    background_tasks: BackgroundTasks,
    sync_svc: SyncService = Depends(get_sync_service)
):
    """Enqueues a sync operation as a background task to prevent blocking HTTP client."""
    try:
        # Enqueue sync service
        background_tasks.add_task(sync_svc.trigger_sync, request.account_id, background_tasks)
        return {"status": "Sync queued", "account_id": request.account_id}
    except Exception as e:
        logger.error(f"Failed to queue sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))
