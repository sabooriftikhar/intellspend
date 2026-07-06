"""
OpenRouter API client — OpenAI-compatible endpoint.
Uses httpx async for non-blocking calls inside FastAPI.
"""

import json
import httpx
from typing import AsyncGenerator
from app.core.config import settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-4o-mini"
MAX_TOKENS = 1024


def _headers() -> dict:
    if not settings.OPENROUTER_API_KEY:
        raise ValueError(
            "OPENROUTER_API_KEY is not set in .env. "
            "Add your key to backend/.env and restart the server."
        )
    return {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "IntellSpend",
    }


def _payload(system_prompt: str, messages: list[dict], stream: bool) -> dict:
    return {
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "stream": stream,
        "messages": [
            {"role": "system", "content": system_prompt},
            *messages,
        ],
    }


# ── Non-streaming (used internally after stream to get clean text) ──
async def chat_completion(system_prompt: str, messages: list[dict]) -> str:
    """Blocking-style: returns the full reply as a string."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            OPENROUTER_URL,
            json=_payload(system_prompt, messages, stream=False),
            headers=_headers(),
        )
    if response.status_code != 200:
        raise RuntimeError(f"OpenRouter error {response.status_code}: {response.text[:300]}")
    return response.json()["choices"][0]["message"]["content"]


# ── Streaming: yields SSE text/event-stream lines ──────────────
async def chat_stream(
    system_prompt: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    """
    Streams the OpenRouter response as Server-Sent Events.

    Yields strings in the format:
        data: <token>\n\n          — a text chunk
        data: [DONE]\n\n           — end of stream
        data: [ERROR] <msg>\n\n    — on failure
    """
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                OPENROUTER_URL,
                json=_payload(system_prompt, messages, stream=True),
                headers=_headers(),
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    yield f"data: [ERROR] OpenRouter {response.status_code}: {body.decode()[:200]}\n\n"
                    return

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    # OpenAI SSE lines look like:  data: {...}
                    if not line.startswith("data:"):
                        continue
                    raw = line[5:].strip()
                    if raw == "[DONE]":
                        yield "data: [DONE]\n\n"
                        return
                    try:
                        chunk = json.loads(raw)
                        token = chunk["choices"][0]["delta"].get("content", "")
                        if token:
                            # Escape newlines so they survive the SSE wire format
                            safe = token.replace("\n", "\\n")
                            yield f"data: {safe}\n\n"
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue

    except ValueError as e:
        yield f"data: [ERROR] {e}\n\n"
    except Exception as e:
        yield f"data: [ERROR] {e}\n\n"
