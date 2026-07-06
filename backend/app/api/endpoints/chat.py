from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.endpoints.users import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.chat import ChatRole
from app.crud import chat as chat_crud
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessageOut
from app.services.ai_context import build_context
from app.services.openrouter import chat_stream, chat_completion

router = APIRouter()


# ── History ────────────────────────────────────────────────────
@router.get("/history", response_model=list[ChatMessageOut])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return chat_crud.get_history(db, user_id=current_user.id)


# ── Streaming endpoint ─────────────────────────────────────────
@router.post("/stream")
async def stream_message(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Streams the AI reply token-by-token as text/event-stream SSE.

    Protocol (each chunk is a separate SSE line):
        data: <token>\\n    — literal text token (\\n encodes newline)
        data: [DONE]        — stream finished
        data: [ERROR] ...   — something went wrong

    After the stream finishes the client should call POST /chat/save
    with the full assembled reply to persist both turns.
    """
    user_message = payload.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        system_prompt = build_context(db, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Context build failed: {e}")

    history = chat_crud.get_history(db, user_id=current_user.id, limit=40)
    messages = [{"role": m.role.value, "content": m.content} for m in history]
    messages.append({"role": "user", "content": user_message})

    return StreamingResponse(
        chat_stream(system_prompt=system_prompt, messages=messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering if behind proxy
        },
    )


# ── Save after stream ──────────────────────────────────────────
@router.post("/save", response_model=list[ChatMessageOut])
def save_exchange(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Called by the frontend after the stream completes.
    Persists the user message + full assistant reply.
    Returns updated history for scroll-back.
    """
    user_msg = (payload.get("user_message") or "").strip()
    assistant_msg = (payload.get("assistant_message") or "").strip()
    if not user_msg or not assistant_msg:
        raise HTTPException(status_code=400, detail="Both user_message and assistant_message required")

    chat_crud.save_message(db, user_id=current_user.id, role=ChatRole.user, content=user_msg)
    chat_crud.save_message(db, user_id=current_user.id, role=ChatRole.assistant, content=assistant_msg)
    return chat_crud.get_history(db, user_id=current_user.id, limit=40)


# ── Non-streaming fallback (kept for compatibility) ────────────
@router.post("/", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_message = payload.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        system_prompt = build_context(db, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Context build failed: {e}")

    history = chat_crud.get_history(db, user_id=current_user.id, limit=40)
    messages = [{"role": m.role.value, "content": m.content} for m in history]
    messages.append({"role": "user", "content": user_message})

    try:
        reply = await chat_completion(system_prompt=system_prompt, messages=messages)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI request failed: {e}")

    chat_crud.save_message(db, user_id=current_user.id, role=ChatRole.user, content=user_message)
    chat_crud.save_message(db, user_id=current_user.id, role=ChatRole.assistant, content=reply)

    updated_history = chat_crud.get_history(db, user_id=current_user.id, limit=40)
    return ChatResponse(reply=reply, history=updated_history)


# ── Clear ──────────────────────────────────────────────────────
@router.delete("/history")
def clear_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = chat_crud.clear_history(db, user_id=current_user.id)
    return {"deleted": count}
