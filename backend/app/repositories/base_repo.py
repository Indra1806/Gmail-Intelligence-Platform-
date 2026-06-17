from supabase import Client

class BaseRepository:
    def __init__(self, db_client: Client | None = None):
        self.db = db_client
