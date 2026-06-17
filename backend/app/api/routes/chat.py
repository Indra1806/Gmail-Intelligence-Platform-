import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from app.models.domain import ChatRequest, ChatResponse
from app.services.chat_agent import ChatAgentService
from app.api.dependencies import get_chat_agent_service

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatSessionCreateRequest(BaseModel):
    user_id: str
    title: str | None = None

class RAGQueryRequest(BaseModel):
    query: str
    session_id: str
    user_id: str
    account_id: str

@router.post("/query", response_model=ChatResponse)
async def query_rag_agent(
    request: RAGQueryRequest,
    chat_svc: ChatAgentService = Depends(get_chat_agent_service)
):
    """Answers a user's natural language query using email documents as a knowledge source."""
    try:
        result = await chat_svc.handle_message(
            user_id=request.user_id,
            account_id=request.account_id,
            session_id=request.session_id,
            query=request.query
        )
        return ChatResponse(
            answer=result["answer"],
            cited_sources=result["cited_sources"]
        )
    except Exception as e:
        logger.error(f"RAG query execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions")
async def create_chat_session(
    request: ChatSessionCreateRequest,
    chat_svc: ChatAgentService = Depends(get_chat_agent_service)
):
    """Creates a new session tracking conversation history."""
    try:
        session = await chat_svc.create_new_session(request.user_id, request.title)
        return session
    except Exception as e:
        logger.error(f"Failed to create chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def get_user_sessions(
    user_id: str = Query(..., description="User UUID"),
    chat_svc: ChatAgentService = Depends(get_chat_agent_service)
):
    """Lists all chat session logs for the user."""
    try:
        sessions = await chat_svc.get_sessions(user_id)
        return sessions
    except Exception as e:
        logger.error(f"Failed to fetch chat sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    chat_svc: ChatAgentService = Depends(get_chat_agent_service)
):
    """Fetches chronological list of chat messages for a session."""
    try:
        messages = await chat_svc.get_session_messages(session_id)
        return messages
    except Exception as e:
        logger.error(f"Failed to fetch session messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
