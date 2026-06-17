from pydantic import BaseModel, Field
from typing import Literal

CategoryType = Literal['Newsletter', 'Job', 'Finance', 'Notification', 'Personal', 'Work', 'Uncategorized']
ToneType = Literal['Professional', 'Casual', 'Urgent', 'Apologetic', 'Persuasive']

class EmailClassificationResult(BaseModel):
    category: CategoryType = Field(description="The assigned category for the email.")
    confidence: float = Field(description="A confidence score between 0.0 and 1.0.")
    explanation: str = Field(description="A 1-sentence explanation of why this category was chosen.")

class ComposeRequest(BaseModel):
    user_prompt: str = Field(..., description="The short instruction from the user, e.g., 'Tell the team the launch is delayed to Friday.'")
    tone: ToneType = Field(default="Professional", description="The desired tone of the email.")
    sender_name: str | None = Field(default=None, description="The name to sign off the email with.")

class DraftEmailResponse(BaseModel):
    subject: str = Field(description="A concise, compelling subject line for the email.")
    body: str = Field(description="The full formatted body of the email, including salutation and sign-off.")

class ReplyRequest(BaseModel):
    account_id: str = Field(..., description="The synchronized Gmail account ID")
    thread_id: str = Field(..., description="The local thread UUID to reply to")
    user_instruction: str = Field(..., description="Short instructions for the AI reply body")

class ChatRequest(BaseModel):
    query: str = Field(..., description="The search or question prompt")
    session_id: str = Field(..., description="Active chat session UUID")
    user_id: str = Field(..., description="The active user UUID")

class ChatResponse(BaseModel):
    answer: str = Field(..., description="The synthesized response answer text")
    cited_sources: list[str] = Field(default=[], description="List of referenced email UUIDs used as sources")
