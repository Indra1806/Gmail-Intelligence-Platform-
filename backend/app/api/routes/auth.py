import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.core.config import settings
from app.repositories.user_repo import UserRepository
from app.api.dependencies import get_user_repo

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/login")
async def login(
    redirect_uri: str | None = Query(None, description="Client frontend callback redirection target")
):
    """Generates the Google OAuth authorization URL redirecting the user to consent page."""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        },
        scopes=[
            "https://mail.google.com/",
            "openid",
            "https://www.googleapis.com/auth/userinfo.email"
        ]
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    
    # We pass redirect_uri inside OAuth state to dynamically restore destination upon callback
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=redirect_uri
    )
    return RedirectResponse(url=authorization_url)


@router.get("/callback")
async def callback(
    code: str,
    state: str | None = None,
    user_repo: UserRepository = Depends(get_user_repo)
):
    """Exchanges Google Authorization Code for Access & Refresh tokens, saving to DB."""
    try:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token"
                }
            },
            scopes=[
                "https://mail.google.com/",
                "openid",
                "https://www.googleapis.com/auth/userinfo.email"
            ]
        )
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
        flow.fetch_token(code=code)
        
        creds = flow.credentials
        
        # Build client to fetch the user's primary email address
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        gmail_address = profile.get("emailAddress")
        
        if not gmail_address:
            raise ValueError("Unable to retrieve email address from Google Profile.")

        # Save credentials to Supabase ( UserRepository handles Fernet encryption under the hood )
        user = await user_repo.get_by_email(gmail_address)
        if not user:
            user = await user_repo.create(gmail_address)
            
        expiry = datetime.now(timezone.utc) + timedelta(seconds=creds.expiry - datetime.now().timestamp() if creds.expiry else 3600)
        account = await user_repo.get_or_create_gmail_account(
            user_id=user["id"],
            email_address=gmail_address,
            access_token=creds.token,
            refresh_token=creds.refresh_token,
            expiry=expiry
        )
        
        # Determine redirection destination
        # Restore target from state payload or fall back to default localhost
        frontend_url = state if state and state.startswith("http") else "http://localhost:3000"
        separator = "&" if "?" in frontend_url else "?"
        return RedirectResponse(url=f"{frontend_url}{separator}account_id={account['id']}&user_id={user['id']}&email={gmail_address}")

    except Exception as e:
        logger.exception("OAuth callback failed")
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")
