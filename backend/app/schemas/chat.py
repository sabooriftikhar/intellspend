from pydantic import BaseModel
from datetime import datetime
from app.models.chat import ChatRole


class ChatMessageOut(BaseModel):
    id: int
    role: ChatRole
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    history: list[ChatMessageOut]
