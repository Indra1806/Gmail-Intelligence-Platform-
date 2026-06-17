import os
import logging
from datetime import datetime, timezone, timedelta
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from app.core.config import settings
from app.repositories.user_repo import UserRepository

logger = logging.getLogger(__name__)

# Standard Google API Client rate limit / network error retry strategy
def is_google_api_retryable_error(exception):
    # HttpError is typical, check for 429 or 5xx status codes
    from googleapiclient.errors import HttpError
    if isinstance(exception, HttpError):
        return exception.resp.status in [429, 500, 502, 503, 504]
    return isinstance(exception, (ConnectionError, TimeoutError))

class GmailAuthWrapper:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def get_client(self, account_id: str):
        account = await self.user_repo.get_gmail_account(account_id)
        if not account:
            raise ValueError(f"Gmail account {account_id} not found.")

        creds = Credentials(
            token=account["access_token"],
            refresh_token=account["refresh_token"],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET
        )

        # Refresh token if expired
        if creds.expired and creds.refresh_token:
            logger.info("Access token expired, refreshing...")
            creds.refresh(Request())
            # Save new tokens back to db ( UserRepository handles encryption automatically )
            expiry = datetime.now(timezone.utc) + timedelta(seconds=creds.expiry - datetime.now().timestamp() if creds.expiry else 3600)
            await self.user_repo.get_or_create_gmail_account(
                user_id=account["user_id"],
                email_address=account["email_address"],
                access_token=creds.token,
                refresh_token=creds.refresh_token,
                expiry=expiry
            )

        return build('gmail', 'v1', credentials=creds)


class GmailService:
    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type(Exception), # Handles raw network and HttpError retries
        reraise=True
    )
    def execute_with_backoff(self, request):
        """Executes a Google API Request with robust exponential backoff retry on transient errors."""
        return request.execute()
