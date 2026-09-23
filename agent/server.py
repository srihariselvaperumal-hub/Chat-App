import asyncio
import base64
import os
from dotenv import load_dotenv

# Load GOOGLE_API_KEY from .env
load_dotenv()
if not os.getenv("GOOGLE_API_KEY"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "AgentTesting", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from google import genai
from google.genai import types

from google.adk.runners import InMemoryRunner

from AgentTesting.agent import root_agent


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(title="Sri AI Agent API")


# ============================================================
# CORS
# Allows React frontend to communicate with FastAPI backend
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# GEMINI CLIENT
# ============================================================

client = genai.Client(
    api_key=os.getenv("GOOGLE_API_KEY")
)


# ============================================================
# ADK RUNNER
# ============================================================

runner = InMemoryRunner(
    agent=root_agent,
    app_name="weather_agent",
)


# ============================================================
# REQUEST MODELS
# ============================================================

class ChatRequest(BaseModel):
    message: str


class VoiceRequest(BaseModel):
    audio_base64: str
    mime_type: str = "audio/wav"


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Sri AI Agent API is running"
    }


# ============================================================
# RUN ADK AGENT
# ============================================================

async def run_agent(message: str) -> str:
    max_attempts = 3

    for attempt in range(max_attempts):
        try:
            result = await runner.run_debug(
                message
            )

            text = ""

            if result and len(result) > 0:
                for event in result:
                    if hasattr(event, "content") and event.content:
                        if (
                            hasattr(event.content, "parts")
                            and event.content.parts
                        ):
                            for part in event.content.parts:
                                if (
                                    hasattr(part, "text")
                                    and part.text
                                ):
                                    text = part.text

            if not text:
                text = "I could not generate a response."

            return text

        except Exception as e:
            error_message = str(e)

            # Gemini temporary server overload
            if (
                "503" in error_message
                or "UNAVAILABLE" in error_message
            ):
                if attempt < max_attempts - 1:
                    await asyncio.sleep(3)
                    continue

                return (
                    "Gemini is temporarily busy. "
                    "Please try again in a few seconds."
                )

            return f"AI error: {error_message}"

    return "Unable to generate a response."


# ============================================================
# NORMAL CHAT
# ============================================================

@app.post("/chat")
async def chat(request: ChatRequest):
    response = await run_agent(
        request.message
    )

    return {
        "response": response
    }


# ============================================================
# TRANSCRIBE VOICE
# ============================================================

async def transcribe_audio(
    audio_bytes: bytes,
    mime_type: str,
) -> str:
    max_attempts = 3

    for attempt in range(max_attempts):
        try:
            audio_part = types.Part.from_bytes(
                data=audio_bytes,
                mime_type=mime_type,
            )

            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-2.5-flash",
                contents=[
                    audio_part,
                    """
Transcribe the user's speech exactly.

Return ONLY the spoken words as plain text.

Do not explain anything.
Do not add quotation marks.
Do not answer the user's question.

If the audio is unclear, return an empty response.
""",
                ],
            )

            text = response.text.strip()
            return text

        except Exception as e:
            error_message = str(e)

            if (
                "503" in error_message
                or "UNAVAILABLE" in error_message
            ):
                if attempt < max_attempts - 1:
                    await asyncio.sleep(3)
                    continue

                raise RuntimeError(
                    "Gemini is temporarily busy. "
                    "Please try again."
                )

            raise


# ============================================================
# VOICE ASSISTANT
# ============================================================

@app.post("/voice")
async def voice(request: VoiceRequest):
    try:
        try:
            audio_bytes = base64.b64decode(
                request.audio_base64
            )
        except Exception:
            return {
                "success": False,
                "error": "Invalid audio data."
            }

        if len(audio_bytes) == 0:
            return {
                "success": False,
                "error": "No audio was received."
            }

        transcript = await transcribe_audio(
            audio_bytes,
            request.mime_type,
        )

        if not transcript:
            return {
                "success": False,
                "error": (
                    "I could not understand the audio. "
                    "Please try speaking again."
                )
            }

        response = await run_agent(
            transcript
        )

        return {
            "success": True,
            "transcript": transcript,
            "response": response,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }
