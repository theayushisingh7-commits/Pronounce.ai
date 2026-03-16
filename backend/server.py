from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Sentence pools by difficulty
SENTENCES = {
    "easy": [
        "The cat sat on the mat.",
        "I like to eat apples.",
        "The sun is very bright today.",
        "She has a red ball.",
        "We go to school by bus.",
        "My dog likes to play.",
        "The bird can fly high.",
        "I drink water every day.",
        "He reads books at night.",
        "The baby is sleeping now.",
        "Fish swim in the water.",
        "I love my family.",
        "The flower is beautiful.",
        "We play in the park.",
        "She sings a nice song."
    ],
    "medium": [
        "The quick brown fox jumps over the lazy dog.",
        "She sells seashells by the seashore.",
        "Peter Piper picked a peck of pickled peppers.",
        "How much wood would a woodchuck chuck?",
        "The weather today is absolutely wonderful.",
        "I would like to order a large pizza please.",
        "The library opens at nine in the morning.",
        "We should exercise regularly for good health.",
        "Technology has changed our daily lives.",
        "The restaurant serves delicious Italian food.",
        "Learning a new language takes time and practice.",
        "The museum has many interesting exhibits.",
        "She graduated from university last year.",
        "The conference will be held next month.",
        "Please remember to bring your identification."
    ],
    "hard": [
        "The phenomenon of bioluminescence occurs in various marine organisms.",
        "Archaeological excavations revealed unprecedented historical artifacts.",
        "The pharmaceutical company developed a revolutionary treatment.",
        "Cryptocurrency regulations vary significantly across jurisdictions.",
        "The entrepreneur successfully established multiple international subsidiaries.",
        "Sophisticated algorithms analyze complex mathematical patterns.",
        "The prestigious university offers comprehensive scholarship programs.",
        "Environmental sustainability requires collaborative international efforts.",
        "The neurological examination revealed no significant abnormalities.",
        "Contemporary architecture emphasizes minimalistic aesthetic principles.",
        "The meteorological forecast predicts unprecedented weather conditions.",
        "Photosynthesis is a fundamental biological process in plants.",
        "The philosophical discourse explored existential paradigms.",
        "Electromagnetic radiation encompasses various wavelength spectrums.",
        "The bureaucratic procedures require meticulous documentation."
    ]
}

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class SentenceResponse(BaseModel):
    sentence: str
    difficulty: str

class AttemptCreate(BaseModel):
    sentence: str
    spoken_text: str
    difficulty: str
    correct_words: int
    total_words: int
    score: float
    incorrect_words: List[dict]

class AttemptResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sentence: str
    spoken_text: str
    difficulty: str
    correct_words: int
    total_words: int
    score: float
    incorrect_words: List[dict]
    timestamp: str

# Add your routes to the router
@api_router.get("/")
async def root():
    return {"message": "AI Pronunciation Coach API"}

@api_router.get("/sentences", response_model=SentenceResponse)
async def get_random_sentence(difficulty: str = "medium"):
    if difficulty not in SENTENCES:
        raise HTTPException(status_code=400, detail="Invalid difficulty level")
    sentence = random.choice(SENTENCES[difficulty])
    return SentenceResponse(sentence=sentence, difficulty=difficulty)

@api_router.get("/sentences/all")
async def get_all_sentences():
    return SENTENCES

@api_router.post("/attempts", response_model=AttemptResponse)
async def create_attempt(attempt: AttemptCreate):
    attempt_dict = attempt.model_dump()
    attempt_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": attempt_id,
        **attempt_dict,
        "timestamp": timestamp
    }
    
    await db.pronunciation_attempts.insert_one(doc)
    
    return AttemptResponse(
        id=attempt_id,
        **attempt_dict,
        timestamp=timestamp
    )

@api_router.get("/attempts", response_model=List[AttemptResponse])
async def get_attempts(limit: int = 20):
    attempts = await db.pronunciation_attempts.find(
        {}, 
        {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    return attempts

@api_router.get("/stats")
async def get_stats():
    total_attempts = await db.pronunciation_attempts.count_documents({})
    
    if total_attempts == 0:
        return {
            "total_attempts": 0,
            "average_score": 0,
            "best_score": 0,
            "attempts_by_difficulty": {"easy": 0, "medium": 0, "hard": 0}
        }
    
    pipeline = [
        {
            "$group": {
                "_id": None,
                "average_score": {"$avg": "$score"},
                "best_score": {"$max": "$score"}
            }
        }
    ]
    
    result = await db.pronunciation_attempts.aggregate(pipeline).to_list(1)
    
    difficulty_pipeline = [
        {
            "$group": {
                "_id": "$difficulty",
                "count": {"$sum": 1}
            }
        }
    ]
    
    difficulty_result = await db.pronunciation_attempts.aggregate(difficulty_pipeline).to_list(10)
    attempts_by_difficulty = {"easy": 0, "medium": 0, "hard": 0}
    for item in difficulty_result:
        if item["_id"] in attempts_by_difficulty:
            attempts_by_difficulty[item["_id"]] = item["count"]
    
    return {
        "total_attempts": total_attempts,
        "average_score": round(result[0]["average_score"], 1) if result else 0,
        "best_score": round(result[0]["best_score"], 1) if result else 0,
        "attempts_by_difficulty": attempts_by_difficulty
    }

@api_router.delete("/attempts")
async def clear_attempts():
    await db.pronunciation_attempts.delete_many({})
    return {"message": "All attempts cleared"}

# Legacy endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
