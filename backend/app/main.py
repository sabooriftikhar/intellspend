from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.endpoints import auth, users, books, accounts, categories, transactions, bills, chat
from app.db import base  # noqa: F401 — registers all ORM models

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/auth",         tags=["auth"])
app.include_router(users.router,        prefix="/users",        tags=["users"])
app.include_router(books.router,        prefix="/books",        tags=["books"])
app.include_router(accounts.router,     prefix="/accounts",     tags=["accounts"])
app.include_router(categories.router,   prefix="/categories",   tags=["categories"])
app.include_router(transactions.router, prefix="/transactions",  tags=["transactions"])
app.include_router(bills.router,        prefix="/bills",         tags=["bills"])
app.include_router(chat.router,         prefix="/chat",          tags=["chat"])


@app.get("/health")
def health():
    return {"status": "ok"}
