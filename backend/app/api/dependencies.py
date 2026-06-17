from fastapi import Depends
from supabase import create_client, Client
from app.core.config import settings

# Repositories
from app.repositories.user_repo import UserRepository
from app.repositories.email_repo import EmailRepository
from app.repositories.thread_repo import ThreadRepository
from app.repositories.sync_repo import SyncRepository
from app.repositories.chat_repo import ChatRepository

# Services
from app.services.ai.summarization import SummarizationService


# DB Client Dependency
def get_db_client() -> Client | None:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# Repository Dependencies
def get_user_repo(db: Client | None = Depends(get_db_client)) -> UserRepository:
    return UserRepository(db)

def get_email_repo(db: Client | None = Depends(get_db_client)) -> EmailRepository:
    return EmailRepository(db)

def get_thread_repo(db: Client | None = Depends(get_db_client)) -> ThreadRepository:
    return ThreadRepository(db)

def get_sync_repo(db: Client | None = Depends(get_db_client)) -> SyncRepository:
    return SyncRepository(db)

def get_chat_repo(db: Client | None = Depends(get_db_client)) -> ChatRepository:
    return ChatRepository(db)

# Services (Will be imported dynamically or defined later)
def get_gmail_auth_wrapper():
    from app.services.gmail_service import GmailAuthWrapper
    return GmailAuthWrapper(get_user_repo())

def get_gmail_service():
    from app.services.gmail_service import GmailService
    return GmailService()

def get_sync_service(
    email_repo: EmailRepository = Depends(get_email_repo),
    thread_repo: ThreadRepository = Depends(get_thread_repo),
    sync_repo: SyncRepository = Depends(get_sync_repo),
    user_repo: UserRepository = Depends(get_user_repo)
):
    from app.services.sync_service import SyncService
    return SyncService(email_repo, thread_repo, sync_repo, user_repo)

def get_summarization_service():
    from app.services.ai.summarization import SummarizationService
    return SummarizationService()

def get_classification_service():
    from app.services.ai.classification import ClassificationService
    return ClassificationService()

def get_email_processing_service(
    email_repo: EmailRepository = Depends(get_email_repo),
    thread_repo: ThreadRepository = Depends(get_thread_repo),
    ai: SummarizationService = Depends(get_summarization_service)
):
    from app.services.email_processing_service import EmailProcessingService
    return EmailProcessingService(email_repo, thread_repo, ai)

def get_composition_service():
    from app.services.ai.composition import CompositionService
    return CompositionService()

def get_reply_generation_service():
    from app.services.ai.reply_generation import ReplyGenerationService
    return ReplyGenerationService()

def get_gmail_send_service():
    from app.services.gmail_send_service import GmailSendService
    return GmailSendService(get_gmail_auth_wrapper())

def get_chat_agent_service(
    email_repo: EmailRepository = Depends(get_email_repo),
    chat_repo: ChatRepository = Depends(get_chat_repo)
):
    from app.services.chat_agent import ChatAgentService
    from app.services.rag.retriever import RobustRAGRetriever
    from app.services.ai.embeddings import EmbeddingService
    from app.services.ai.nim_reranker import NIMRerankingService
    
    embedder = EmbeddingService()
    nim_reranker = NIMRerankingService()
    retriever = RobustRAGRetriever(email_repo, embedder, nim_reranker)
    return ChatAgentService(retriever, chat_repo)
