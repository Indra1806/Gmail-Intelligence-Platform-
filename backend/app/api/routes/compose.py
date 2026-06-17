import logging
from fastapi import APIRouter, Depends, HTTPException
from app.models.domain import ComposeRequest, DraftEmailResponse
from app.services.ai.composition import CompositionService
from app.api.dependencies import get_composition_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/compose", response_model=DraftEmailResponse)
async def compose_email(
    request: ComposeRequest,
    ai: CompositionService = Depends(get_composition_service)
):
    """Drafts a complete email (Subject and Body) from a simple user prompt and tone preference."""
    try:
        draft = await ai.draft_email(request)
        return draft
    except Exception as e:
        logger.error(f"Compose assistant failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate draft: {str(e)}")
