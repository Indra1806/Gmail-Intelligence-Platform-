import base64
import logging
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from app.repositories.email_repo import EmailRepository
from app.repositories.thread_repo import ThreadRepository
from app.repositories.sync_repo import SyncRepository
from app.repositories.user_repo import UserRepository
from app.services.gmail_service import GmailAuthWrapper, GmailService

logger = logging.getLogger(__name__)

class SyncService:
    def __init__(
        self,
        email_repo: EmailRepository,
        thread_repo: ThreadRepository,
        sync_repo: SyncRepository,
        user_repo: UserRepository
    ):
        self.email_repo = email_repo
        self.thread_repo = thread_repo
        self.sync_repo = sync_repo
        self.user_repo = user_repo
        self.auth_wrapper = GmailAuthWrapper(user_repo)
        self.gmail = GmailService()

    async def trigger_sync(self, account_id: str, background_tasks = None):
        """Orchestrates initial or incremental sync for a Gmail Account."""
        logger.info(f"Triggering sync for account {account_id}...")
        
        # Initialize sync state if missing
        state = await self.sync_repo.get_state(account_id)
        if not state:
            state = await self.sync_repo.update_state(account_id, {"sync_status": "syncing"})
            
        await self.sync_repo.update_state(account_id, {"sync_status": "syncing"})
        
        try:
            client = await self.auth_wrapper.get_client(account_id)
            history_id = state.get("history_id") if state else None
            
            if not history_id:
                logger.info("No history ID found. Commencing Initial Full Sync.")
                new_history_id = await self._initial_sync(account_id, client, background_tasks)
            else:
                logger.info(f"History ID {history_id} found. Commencing Incremental Sync.")
                new_history_id = await self._incremental_sync(account_id, history_id, client, background_tasks)
                
            # Update sync state to complete
            await self.sync_repo.update_state(account_id, {
                "history_id": new_history_id or history_id,
                "sync_status": "completed"
            })
            logger.info("Sync completed successfully.")
            return {"status": "success", "history_id": new_history_id or history_id}
            
        except Exception as e:
            logger.error(f"Sync failed for account {account_id}: {str(e)}")
            await self.sync_repo.update_state(account_id, {"sync_status": "failed"})
            raise e

    async def _initial_sync(self, account_id: str, client, background_tasks) -> str:
        """Downloads all messages from Gmail Inbox, handling pagination gracefully."""
        # 1. Fetch messages list with pagination support
        next_page_token = None
        messages = []
        max_messages_limit = 100
        page_count = 0
        
        while True:
            list_req = client.users().messages().list(
                userId='me', 
                maxResults=20, 
                pageToken=next_page_token
            )
            list_resp = self.gmail.execute_with_backoff(list_req)
            
            page_messages = list_resp.get("messages", [])
            messages.extend(page_messages)
            
            next_page_token = list_resp.get("nextPageToken")
            page_count += 1
            
            if not next_page_token or len(messages) >= max_messages_limit or page_count >= 5:
                break
                
        history_id = "1000" # fallback seed
        
        for msg_summary in messages:
            msg_id = msg_summary["id"]
            await self._process_single_message(account_id, msg_id, client, background_tasks)
            
        # Retrieve the latest profile to get current history ID
        try:
            profile_req = client.users().getProfile(userId='me')
            profile = self.gmail.execute_with_backoff(profile_req)
            history_id = profile.get("historyId", "1000")
        except Exception:
            history_id = "1000"
                
        return history_id

    async def _incremental_sync(self, account_id: str, start_history_id: str, client, background_tasks) -> str:
        """Downloads only the messages/events that occurred since start_history_id."""
        try:
            history_req = client.users().history().list(userId='me', startHistoryId=start_history_id)
            history_resp = self.gmail.execute_with_backoff(history_req)
        except Exception as e:
            # If history_id is expired (HTTP 410), fallback to a full sync
            logger.warning(f"Incremental history expired: {e}. Performing fallback full sync.")
            return await self._initial_sync(account_id, client, background_tasks)
            
        history_events = history_resp.get("history", [])
        next_history_id = history_resp.get("historyId", start_history_id)
        
        for event in history_events:
            # Process added messages
            added = event.get("messagesAdded", [])
            for add_item in added:
                msg_id = add_item["message"]["id"]
                await self._process_single_message(account_id, msg_id, client, background_tasks)
                
        return next_history_id

    async def _process_single_message(self, account_id: str, msg_id: str, client, background_tasks):
        """Downloads full details for one message, parses it, and creates DB entries."""
        try:
            get_req = client.users().messages().get(userId='me', id=msg_id, format='full')
            message = self.gmail.execute_with_backoff(get_req)
        except Exception as e:
            logger.error(f"Failed to fetch message details for {msg_id}: {e}")
            return

        gmail_thread_id = message.get("threadId")
        snippet = message.get("snippet", "")
        labels = message.get("labelIds", [])
        
        # 1. Parse Headers & Body
        payload = message.get("payload", {})
        headers = payload.get("headers", [])
        
        parsed_headers = {}
        for h in headers:
            parsed_headers[h["name"].lower()] = h["value"]
            
        subject = parsed_headers.get("subject", "(No Subject)")
        from_email = parsed_headers.get("from", "")
        to_field = parsed_headers.get("to", "")
        cc_field = parsed_headers.get("cc", "")
        bcc_field = parsed_headers.get("bcc", "")
        date_str = parsed_headers.get("date", "")
        message_id_header = parsed_headers.get("message-id", f"<{msg_id}@mail.gmail.com>")

        # Extract structured email arrays
        to_emails = [email.strip() for email in to_field.split(",") if email.strip()]
        cc_emails = [email.strip() for email in cc_field.split(",") if email.strip()]
        bcc_emails = [email.strip() for email in bcc_field.split(",") if email.strip()]

        # Parse Date
        received_at = datetime.now(timezone.utc)
        if date_str:
            try:
                # Basic parsing, email headers have diverse formats
                import email.utils
                parsed_date = email.utils.parsedate_to_datetime(date_str)
                received_at = parsed_date.astimezone(timezone.utc)
            except Exception:
                pass

        # 2. Extract Body (HTML & Plain Text)
        body_text, body_html = self._extract_body(payload)
        
        # Strip html tags to generate indexable text body if only HTML was present
        if not body_text and body_html:
            try:
                soup = BeautifulSoup(body_html, "html.parser")
                body_text = soup.get_text(separator="\n")
            except Exception:
                body_text = snippet

        # 3. Create or Update Thread Record
        thread = await self.thread_repo.get_by_gmail_thread_id(account_id, gmail_thread_id)
        if not thread:
            thread = await self.thread_repo.create_or_update({
                "account_id": account_id,
                "gmail_thread_id": gmail_thread_id,
                "subject": subject,
                "participant_emails": list(set([from_email] + to_emails)),
                "last_message_at": received_at.isoformat(),
                "message_count": 1,
                "category": "Uncategorized"
            })
        else:
            # Update participants & message count
            participants = list(set(thread.get("participant_emails", []) + [from_email] + to_emails))
            db_last = thread.get("last_message_at")
            if isinstance(db_last, str):
                try:
                    db_last_parsed = datetime.fromisoformat(db_last.replace('Z', '+00:00'))
                except Exception:
                    db_last_parsed = received_at
            elif isinstance(db_last, datetime):
                db_last_parsed = db_last
            else:
                db_last_parsed = received_at
                
            new_last = max(db_last_parsed, received_at)
            thread = await self.thread_repo.create_or_update({
                "account_id": account_id,
                "gmail_thread_id": gmail_thread_id,
                "participant_emails": participants,
                "last_message_at": new_last.isoformat(),
                "message_count": thread.get("message_count", 0) + 1
            })

        # 4. Save Email Record
        email_record = {
            "account_id": account_id,
            "thread_id": thread["id"],
            "gmail_message_id": message_id_header,
            "subject": subject,
            "from_email": from_email,
            "to_emails": to_emails,
            "cc_emails": cc_emails,
            "bcc_emails": bcc_emails,
            "body_text": body_text or snippet,
            "body_html": body_html,
            "snippet": snippet,
            "received_at": received_at.isoformat(),
            "is_read": "UNREAD" not in labels,
            "labels": labels,
            "category": "Uncategorized"
        }
        saved_email = await self.email_repo.create_or_update(email_record)

        # 5. Enqueue AI Processing tasks (background)
        if background_tasks:
            from app.services.email_processing_service import EmailProcessingService
            from app.services.ai.summarization import SummarizationService
            from app.services.ai.classification import ClassificationService
            from app.repositories.chat_repo import ChatRepository
            from app.services.chat_agent import ChatAgentService
            from app.services.rag.retriever import RobustRAGRetriever
            from app.services.ai.embeddings import EmbeddingService
            from app.services.ai.nim_reranker import NIMRerankingService

            # Instantiate services manually to avoid Depends default values bug in background tasks
            summarizer_svc = SummarizationService()
            processing_svc = EmailProcessingService(self.email_repo, self.thread_repo, summarizer_svc)
            classification_svc = ClassificationService()
            
            chat_repo = ChatRepository(self.email_repo.db)
            embedder = EmbeddingService()
            nim_reranker = NIMRerankingService()
            retriever = RobustRAGRetriever(self.email_repo, embedder, nim_reranker)
            chat_agent_svc = ChatAgentService(retriever, chat_repo)

            background_tasks.add_task(processing_svc.process_new_email, saved_email["id"])
            background_tasks.add_task(self._process_classification, saved_email["id"], classification_svc)
            background_tasks.add_task(self._process_embeddings, saved_email["id"], chat_agent_svc)

    async def _process_classification(self, email_id: str, ai_service):
        email = await self.email_repo.get_by_id(email_id)
        if not email:
            return
        result = await ai_service.classify_email(
            sender=email.from_email,
            subject=email.subject,
            snippet=email.snippet or email.body_text
        )
        await self.email_repo.update(email_id, {
            "category": result.category
        })
        
        # Also sync thread category if thread category is default/empty
        thread = await self.thread_repo.get_by_id(email.thread_id)
        if thread and (not thread.get("category") or thread.get("category") == "Uncategorized"):
            await self.thread_repo.update(thread["id"], {"category": result.category})

    async def _process_embeddings(self, email_id: str, chat_svc):
        email = await self.email_repo.get_by_id(email_id)
        if not email or not email.body_text:
            return
        # Process and save embeddings
        embeddings = await chat_svc.retriever.embedder.process_email_for_embedding(
            email_id=email.id,
            thread_id=email.thread_id,
            subject=email.subject,
            sender=email.from_email,
            body=email.body_text
        )
        await self.email_repo.save_embeddings(embeddings)

    def _extract_body(self, payload: dict) -> tuple[str, str]:
        """Recursively parses email parts to locate text/plain and text/html bodies."""
        body_text = ""
        body_html = ""
        
        mime_type = payload.get("mimeType", "")
        parts = payload.get("parts", [])
        
        # If payload itself contains body data
        body_data = payload.get("body", {}).get("data", "")
        if body_data:
            decoded = self._decode_body(body_data)
            if mime_type == "text/plain":
                body_text = decoded
            elif mime_type == "text/html":
                body_html = decoded
                
        # Traverse parts
        for part in parts:
            part_mime = part.get("mimeType", "")
            part_body = part.get("body", {}).get("data", "")
            
            if part_body:
                decoded = self._decode_body(part_body)
                if part_mime == "text/plain":
                    body_text += decoded
                elif part_mime == "text/html":
                    body_html += decoded
            
            # Nested parts (e.g. multipart/alternative inside multipart/mixed)
            if "parts" in part:
                t, h = self._extract_body(part)
                body_text += t
                body_html += h
                
        return body_text, body_html

    def _decode_body(self, data: str) -> str:
        """Decodes URLsafe Base64 encoded email MIME text."""
        if not data:
            return ""
        # Restore padding if missing
        missing_padding = len(data) % 4
        if missing_padding:
            data += '=' * (4 - missing_padding)
        try:
            return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
        except Exception:
            try:
                # Direct decode using ASCII encoded input
                return base64.urlsafe_b64decode(data.encode("ASCII")).decode("utf-8", errors="ignore")
            except Exception:
                return ""
