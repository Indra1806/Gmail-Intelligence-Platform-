from fastapi import APIRouter
from app.api.routes import auth, sync, emails, compose, reply, chat

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(emails.router, prefix="/emails", tags=["emails"])
api_router.include_router(compose.router, prefix="/emails", tags=["compose"])
api_router.include_router(reply.router, prefix="/threads", tags=["reply"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
