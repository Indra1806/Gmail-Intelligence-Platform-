import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.api.dependencies import (
    get_user_repo,
    get_email_repo,
    get_thread_repo,
    get_sync_repo,
    get_chat_repo,
    get_db_client,
    get_composition_service,
    get_reply_generation_service,
    get_gmail_send_service
)
from app.models.domain import DraftEmailResponse

# Create TestClient
client = TestClient(app)

# --- Mock Repositories ---

class MockUserRepo:
    def __init__(self):
        self.users = {
            "00000000-0000-0000-0000-000000000001": {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "test@example.com"
            }
        }
        self.accounts = {
            "00000000-0000-0000-0000-000000000002": {
                "id": "00000000-0000-0000-0000-000000000002",
                "user_id": "00000000-0000-0000-0000-000000000001",
                "email_address": "test@example.com",
                "access_token": "mock_access_token",
                "refresh_token": "mock_refresh_token"
            }
        }
        
    async def get_by_email(self, email: str):
        for u in self.users.values():
            if u["email"] == email:
                return u
        return None

    async def get_by_id(self, user_id: str):
        return self.users.get(user_id)

    async def create(self, email: str):
        uid = str(uuid.uuid4())
        self.users[uid] = {"id": uid, "email": email}
        return self.users[uid]

    async def get_or_create_gmail_account(self, user_id: str, email_address: str, access_token: str, refresh_token: str, expiry):
        aid = "00000000-0000-0000-0000-000000000002"
        self.accounts[aid] = {
            "id": aid,
            "user_id": user_id,
            "email_address": email_address,
            "access_token": access_token,
            "refresh_token": refresh_token
        }
        return self.accounts[aid]

    async def get_gmail_account(self, account_id: str):
        return self.accounts.get(account_id)


class MockEmailRepo:
    def __init__(self):
        self.emails = {
            "00000000-0000-0000-0000-000000000101": {
                "id": "00000000-0000-0000-0000-000000000101",
                "account_id": "00000000-0000-0000-0000-000000000002",
                "thread_id": "00000000-0000-0000-0000-00000000000a",
                "gmail_message_id": "<msg@example.com>",
                "gmail_thread_id": "thread_111",
                "subject": "Job Interview Scheduling",
                "from_email": "recruiting@startup.com",
                "to_emails": ["test@example.com"],
                "body_text": "Hi Team, Can you please send the API specifications?",
                "received_at": "2026-06-18T00:00:00Z"
            }
        }
        
    async def get_by_id(self, email_id: str):
        class EmailWrapper(dict):
            def __getattr__(self, name):
                return self.get(name)
        res = self.emails.get(email_id)
        return EmailWrapper(res) if res else None

    async def get_by_thread_id(self, thread_id: str, order_by: str = "received_at ASC"):
        class EmailWrapper(dict):
            def __getattr__(self, name):
                return self.get(name)
        return [EmailWrapper(e) for e in self.emails.values() if e["thread_id"] == thread_id]

    async def get_all_emails_by_account(self, account_id: str, category: str | None = None):
        return list(self.emails.values())


class MockThreadRepo:
    def __init__(self):
        self.threads = {
            "00000000-0000-0000-0000-00000000000a": {
                "id": "00000000-0000-0000-0000-00000000000a",
                "account_id": "00000000-0000-0000-0000-000000000002",
                "subject": "Project Proposal - OVO Launch"
            }
        }
        
    async def get_by_id(self, thread_id: str):
        return self.threads.get(thread_id)

    async def get_all_threads_by_account(self, account_id: str, category: str | None = None):
        return list(self.threads.values())


class MockChatRepo:
    def __init__(self):
        self.sessions = {}
        self.messages = []
        
    async def create_session(self, user_id: str, title: str | None = None):
        sid = "00000000-0000-0000-0000-00000000000c"
        self.sessions[sid] = {"id": sid, "user_id": user_id, "title": title or "New Chat"}
        return self.sessions[sid]

    async def get_sessions_by_user(self, user_id: str):
        return list(self.sessions.values())

    async def get_session_history(self, session_id: str, limit: int = 50):
        return [m for m in self.messages if m["session_id"] == session_id][:limit]

    async def save_message(self, session_id: str, role: str, content: str, cited_sources: list[str] | None = None):
        msg = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": role,
            "content": content,
            "cited_sources": cited_sources or [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self.messages.append(msg)
        return msg


# Instantiate global mocks
mock_user_repo = MockUserRepo()
mock_email_repo = MockEmailRepo()
mock_thread_repo = MockThreadRepo()
mock_chat_repo = MockChatRepo()

# --- Mock AI / Send Services ---

class MockCompositionService:
    async def draft_email(self, request):
        return DraftEmailResponse(
            subject="Request refund from AWS",
            body="Dear AWS, I am writing to request a refund for an accidental database instance..."
        )

class MockReplyGenerationService:
    async def generate_reply(self, user_instruction: str, reply_to_email: str, thread_history: str):
        return "Sure, the platform is built and ready to launch."

class MockGmailSendService:
    async def send_thread_reply(self, account_id: str, gmail_thread_id: str, to_email: str, subject: str, body: str, last_message_id: str, all_message_ids: list[str]):
        return {"messageId": "sent_123", "threadId": gmail_thread_id}


mock_comp_svc = MockCompositionService()
mock_reply_svc = MockReplyGenerationService()
mock_send_svc = MockGmailSendService()

# --- Inject Dependency Overrides ---

app.dependency_overrides[get_db_client] = lambda: MagicMock()
app.dependency_overrides[get_user_repo] = lambda: mock_user_repo
app.dependency_overrides[get_email_repo] = lambda: mock_email_repo
app.dependency_overrides[get_thread_repo] = lambda: mock_thread_repo
app.dependency_overrides[get_chat_repo] = lambda: mock_chat_repo
app.dependency_overrides[get_composition_service] = lambda: mock_comp_svc
app.dependency_overrides[get_reply_generation_service] = lambda: mock_reply_svc
app.dependency_overrides[get_gmail_send_service] = lambda: mock_send_svc


# --- Unit Tests ---

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["sandbox_mode"] is False


def test_auth_login_redirect():
    response = client.get("/api/v1/auth/login", allow_redirects=False)
    assert response.status_code == 307
    # Redirects to Google consent screen auth endpoint
    assert "accounts.google.com" in response.headers["location"]


def test_auth_callback():
    # Mock Flow
    mock_flow = MagicMock()
    mock_creds = MagicMock()
    mock_creds.token = "mock_access"
    mock_creds.refresh_token = "mock_refresh"
    mock_creds.expiry = None
    mock_flow.credentials = mock_creds

    # Mock Google profile API response
    mock_service = MagicMock()
    mock_service.users().getProfile(userId='me').execute.return_value = {"emailAddress": "test@example.com"}

    with patch('app.api.routes.auth.Flow.from_client_config', return_value=mock_flow), \
         patch('app.api.routes.auth.build', return_value=mock_service):
         
        response = client.get("/api/v1/auth/callback?code=mock_code", allow_redirects=False)
        assert response.status_code == 307
        assert "account_id=" in response.headers["location"]


def test_get_emails_and_threads():
    account_id = "00000000-0000-0000-0000-000000000002"

    # Get emails
    email_resp = client.get(f"/api/v1/emails?account_id={account_id}")
    assert email_resp.status_code == 200
    assert len(email_resp.json()) > 0
    assert email_resp.json()[0]["account_id"] == account_id

    # Get threads
    thread_resp = client.get(f"/api/v1/emails/threads?account_id={account_id}")
    assert thread_resp.status_code == 200
    assert len(thread_resp.json()) > 0


def test_compose_email():
    payload = {
        "user_prompt": "Request refund from AWS for accidental database instance",
        "tone": "Persuasive",
        "sender_name": "Sandbox Admin"
    }
    response = client.post("/api/v1/emails/compose", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert "subject" in res_data
    assert "body" in res_data
    assert "AWS" in res_data["body"] or "refund" in res_data["body"].lower()


def test_reply_thread():
    thread_id = "00000000-0000-0000-0000-00000000000a"
    account_id = "00000000-0000-0000-0000-000000000002"
    
    payload = {
        "account_id": account_id,
        "thread_id": thread_id,
        "user_instruction": "Sure, tell them it's built and ready to launch."
    }
    response = client.post("/api/v1/threads/reply", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "Reply sent successfully"
    assert "sent_body" in res_data
    assert "gmail_response" in res_data


@patch('app.services.rag.retriever.RobustRAGRetriever.retrieve_context')
@patch('app.services.chat_agent.ChatAgentService.handle_message')
def test_rag_query(mock_handle, mock_retrieve_context):
    account_id = "00000000-0000-0000-0000-000000000002"
    user_id = "00000000-0000-0000-0000-000000000001"
    
    # 1. Create session
    sess_resp = client.post("/api/v1/chat/sessions", json={"user_id": user_id, "title": "Test Chat"})
    assert sess_resp.status_code == 200
    sess_id = sess_resp.json()["id"]

    # Mock RAG agent handling response
    mock_handle.return_value = {
        "answer": "The recruiter at startup.com is asking for specifications.",
        "cited_sources": ["00000000-0000-0000-0000-000000000101"]
    }

    # 2. RAG Query
    payload = {
        "query": "Who is asking for Gmail specifications?",
        "session_id": sess_id,
        "user_id": user_id,
        "account_id": account_id
    }
    
    # Simulate adding the messages for session retrieval verification
    mock_chat_repo.messages.append({
        "session_id": sess_id, "role": "user", "content": payload["query"]
    })
    mock_chat_repo.messages.append({
        "session_id": sess_id, "role": "assistant", "content": "The recruiter at startup.com is asking for specifications."
    })

    response = client.post("/api/v1/chat/query", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert "answer" in res_data
    assert len(res_data["cited_sources"]) > 0

    # 3. Retrieve messages
    msg_resp = client.get(f"/api/v1/chat/sessions/{sess_id}/messages")
    assert msg_resp.status_code == 200
    assert len(msg_resp.json()) == 2
