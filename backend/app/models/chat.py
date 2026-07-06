from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from app.db.session import Base
import sqlalchemy as sa
import enum

class ChatRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, sa.ForeignKey("users.id"))
    role = Column(SAEnum(ChatRole))
    content = Column(String)
    created_at = Column(DateTime, server_default=sa.func.now())
