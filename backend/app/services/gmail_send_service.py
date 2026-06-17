import base64
import logging
from email.message import EmailMessage
from app.services.gmail_service import GmailAuthWrapper

logger = logging.getLogger(__name__)

class GmailSendService:
    def __init__(self, auth_wrapper: GmailAuthWrapper):
        self.auth = auth_wrapper

    async def send_thread_reply(
        self, 
        account_id: str, 
        gmail_thread_id: str, 
        to_email: str, 
        subject: str, 
        body: str, 
        last_message_id: str | None = None, 
        all_message_ids: list[str] | None = None
    ) -> dict:
        """Constructs a MIME email with threading headers and sends it via the Gmail API."""
        client = await self.auth.get_client(account_id)
        
        # 1. Construct the raw MIME email
        message = EmailMessage()
        message.set_content(body)
        message['To'] = to_email
        
        # Ensure subject has Re: prefix
        clean_subject = subject if subject.lower().startswith("re:") else f"Re: {subject}"
        message['Subject'] = clean_subject
        
        # 2. Inject Thread Preservation Headers (CRITICAL)
        if last_message_id:
            message['In-Reply-To'] = last_message_id
            
        if all_message_ids:
            message['References'] = " ".join(all_message_ids)
            
        # 3. Base64 URL encode message
        raw_bytes = message.as_bytes()
        encoded = base64.urlsafe_b64encode(raw_bytes).decode("utf-8")
        
        envelope = {
            'raw': encoded,
            'threadId': gmail_thread_id
        }

        # 4. Send

        try:
            # users().messages().send returns sent details
            send_req = client.users().messages().send(userId='me', body=envelope)
            sent_message = send_req.execute()
            return sent_message
        except Exception as e:
            logger.error(f"Failed to send email via Gmail API: {e}")
            raise RuntimeError(f"Gmail API transmission failed: {str(e)}")
