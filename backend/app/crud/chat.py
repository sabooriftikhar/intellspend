from sqlalchemy.orm import Session
from app.models.chat import ChatMessage, ChatRole


def get_history(db: Session, user_id: int, limit: int = 40) -> list[ChatMessage]:
    """Return the last `limit` messages for scroll-back, oldest first."""
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()[::-1]  # reverse so oldest is first
    )


def save_message(db: Session, user_id: int, role: ChatRole, content: str) -> ChatMessage:
    msg = ChatMessage(user_id=user_id, role=role, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def clear_history(db: Session, user_id: int) -> int:
    """Delete all chat history for a user. Returns rows deleted."""
    count = db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete()
    db.commit()
    return count
