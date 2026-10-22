"""
Somnium - AI Dream Journal Backend
FastAPI + ML Pipeline for Dream Analysis
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import json
import os
import hashlib
import random

# ML / NLP imports
from textblob import TextBlob
import numpy as np
from collections import Counter, defaultdict
import re

app = FastAPI(title="Somnium API", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════

class DreamEntry(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10)
    mood_before_sleep: str = Field(..., description="happy, sad, anxious, excited, neutral, stressed, tired")
    sleep_quality: int = Field(..., ge=1, le=10)
    sleep_hours: float = Field(..., ge=0, le=24)
    tags: List[str] = []
    date: Optional[str] = None
    has_sketch: bool = False
    sketch_data: Optional[str] = None  # base64 or placeholder
    lucid: bool = False
    recurring: bool = False

class DreamAnalysis(BaseModel):
    sentiment_score: float
    dominant_emotions: List[Dict[str, Any]]
    extracted_symbols: List[Dict[str, Any]]
    dream_dna: Dict[str, Any]
    interpretation: str
    lucidity_probability: float
    recurring_pattern_detected: bool
    similar_past_dreams: List[Dict[str, Any]]
    explanation_trace: List[str]
    collective_insight: Optional[str] = None

class UserStats(BaseModel):
    total_dreams: int
    lucid_dreams: int
    recurring_symbols: List[Dict[str, Any]]
    dream_dna_fingerprint: Dict[str, Any]
    emotion_timeline: List[Dict[str, Any]]
    symbol_evolution: List[Dict[str, Any]]
    avg_sleep_quality: float
    avg_sleep_hours: float
    dream_signs: List[str]
    streak_days: int

# ═══════════════════════════════════════════════════════
# IN-MEMORY DATABASE (for demo - replace with real DB)
# ═══════════════════════════════════════════════════════

dreams_db: List[Dict[str, Any]] = []
symbol_ontology: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "contexts": [], "personal_meaning": None})
user_profile = {
    "total_dreams": 0,
    "lucid_count": 0,
    "symbol_frequencies": Counter(),
    "emotion_history": [],
    "dream_dna_vector": np.zeros(20),
    "first_entry_date": None,
    "last_entry_date": None,
}

# ═══════════════════════════════════════════════════════
# SYMBOL KNOWLEDGE BASE (Neuro-Symbolic Layer)
# ═══════════════════════════════════════════════════════

SYMBOL_DATABASE = {
    "water": {"archetype": "emotion", "meanings": ["unconscious mind", "emotional state", "purification", "life force"], "contexts": ["ocean", "river", "rain", "flood", "pool"]},
    "flying": {"archetype": "freedom", "meanings": ["liberation", "ambition", "escape", "spiritual elevation"], "contexts": ["sky", "wings", "floating", "falling"]},
    "falling": {"archetype": "insecurity", "meanings": ["loss of control", "fear of failure", "letting go", "grounding needed"], "contexts": ["cliff", "building", "sky", "depths"]},
    "door": {"archetype": "threshold", "meanings": ["new opportunities", "transition", "hidden aspects", "choices"], "contexts": ["locked", "open", "red", "mysterious"]},
    "snake": {"archetype": "transformation", "meanings": ["rebirth", "hidden threats", "wisdom", "sexuality"], "contexts": ["biting", "shedding", "coiled", "colorful"]},
    "teeth": {"archetype": "power", "meanings": ["self-image", "communication", "aging anxiety", "confidence"], "contexts": ["falling out", "breaking", "growing", "sharp"]},
    "chase": {"archetype": "avoidance", "meanings": ["running from problems", "unresolved issues", "fear", "pursuit of goals"], "contexts": ["monster", "person", "unknown", "animal"]},
    "fire": {"archetype": "passion", "meanings": ["transformation", "anger", "creativity", "destruction"], "contexts": ["burning", "warmth", "wildfire", "candle"]},
    "house": {"archetype": "self", "meanings": ["psyche structure", "family", "security", "identity"], "contexts": ["old", "new", "haunted", "childhood"]},
    "animal": {"archetype": "instinct", "meanings": ["primal urges", "spirit guide", "unrecognized traits", "nature connection"], "contexts": ["talking", "wild", "tame", "mythical"]},
    "death": {"archetype": "endings", "meanings": ["transformation", "fear of change", "closure", "rebirth"], "contexts": ["self", "loved one", "stranger", "animal"]},
    "baby": {"archetype": "potential", "meanings": ["new beginnings", "vulnerability", "creativity", "innocence"], "contexts": ["crying", "laughing", "yours", "unknown"]},
    "school": {"archetype": "learning", "meanings": ["life lessons", "anxiety", "growth", "evaluation"], "contexts": ["exam", "forgot homework", "teaching", "graduation"]},
    "naked": {"archetype": "vulnerability", "meanings": ["exposure", "authenticity", "shame", "freedom"], "contexts": ["public", "alone", "comfortable", "embarrassed"]},
    "car": {"archetype": "journey", "meanings": ["life direction", "control", "ambition", "status"], "contexts": ["driving", "passenger", "crash", "lost"]},
    "bridge": {"archetype": "connection", "meanings": ["transition", "overcoming obstacles", "linking worlds", "decision point"], "contexts": ["crossing", "broken", "high", "under"]},
    "mirror": {"archetype": "reflection", "meanings": ["self-perception", "truth", "identity", "vanity"], "contexts": ["broken", "talking", "different face", "infinite"]},
    "forest": {"archetype": "unknown", "meanings": ["exploration", "lost", "growth", "mystery"], "contexts": ["dark", "enchanted", "clearing", "path"]},
    "mountain": {"archetype": "challenge", "meanings": ["obstacles", "achievement", "perspective", "stability"], "contexts": ["climbing", "peak", "avalanche", "view"]},
    "ocean": {"archetype": "depth", "meanings": ["vast unconscious", "emotions", "mystery", "infinity"], "contexts": ["deep", "stormy", "calm", "drowning"]},
}

EMOTION_LEXICON = {
    "happy": ["joy", "laughter", "smile", "bright", "sunshine", "celebrate", "dance", "sing"],
    "sad": ["cry", "tears", "dark", "grey", "loss", "grief", "alone", "empty"],
    "anxious": ["worry", "nervous", "tense", "racing", "panic", "sweat", "shake", "dread"],
    "fear": ["terror", "scream", "run", "hide", "monster", "darkness", "threat", "danger"],
    "excited": ["thrill", "adventure", "energy", "fast", "rush", "amazing", "incredible"],
    "peaceful": ["calm", "serene", "quiet", "gentle", "soft", "tranquil", "harmony"],
    "angry": ["rage", "fight", "shout", "fire", "storm", "attack", "destroy", "hate"],
    "love": ["kiss", "embrace", "warm", "heart", "tender", "beautiful", "cherish", "intimate"],
    "confused": ["lost", "maze", "puzzle", "strange", "weird", "unclear", "fog", "blur"],
    "empowered": ["strong", "victory", "conquer", "power", "giant", "hero", "champion", "mighty"],
}

# ═══════════════════════════════════════════════════════
# ML PIPELINE FUNCTIONS
# ═══════════════════════════════════════════════════════

def extract_symbols(text: str) -> List[Dict[str, Any]]:
    """Neuro-Symbolic Symbol Extraction"""
    text_lower = text.lower()
    found_symbols = []

    for symbol, data in SYMBOL_DATABASE.items():
        # Direct match
        if symbol in text_lower:
            confidence = min(0.95, 0.7 + (text_lower.count(symbol) * 0.05))
            # Check for context modifiers
            contexts_found = [ctx for ctx in data["contexts"] if ctx in text_lower]
            if contexts_found:
                confidence = min(0.99, confidence + 0.1)

            # Personal frequency boost
            personal_count = symbol_ontology[symbol]["count"]
            if personal_count > 2:
                confidence = min(0.99, confidence + 0.05)

            found_symbols.append({
                "symbol": symbol,
                "confidence": round(confidence, 3),
                "archetype": data["archetype"],
                "meanings": data["meanings"][:2],  # Top 2 meanings
                "contexts_found": contexts_found[:2],
                "personal_frequency": personal_count,
                "explanation": f"Detected '{symbol}' in context of {', '.join(contexts_found[:2]) if contexts_found else 'general narrative'}. "
                              f"Archetype: {data['archetype']}. Personal recurrence: {personal_count}x."
            })

    # Sort by confidence
    found_symbols.sort(key=lambda x: x["confidence"], reverse=True)
    return found_symbols[:5]  # Top 5 symbols

def analyze_sentiment(text: str) -> Dict[str, Any]:
    """Advanced Sentiment with Emotion Detection"""
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    subjectivity = blob.sentiment.subjectivity

    # Emotion detection via lexicon
    text_lower = text.lower()
    emotion_scores = {}
    for emotion, keywords in EMOTION_LEXICON.items():
        score = sum(2 if kw in text_lower else 0 for kw in keywords)
        # Boost for repeated keywords
        for kw in keywords:
            count = text_lower.count(kw)
            if count > 1:
                score += count * 0.5
        emotion_scores[emotion] = score

    # Normalize
    total = sum(emotion_scores.values()) or 1
    emotion_scores = {k: round(v/total, 3) for k, v in emotion_scores.items()}
    top_emotions = sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)[:3]

    # Sentiment label
    if polarity > 0.3:
        sentiment_label = "Positive"
    elif polarity < -0.3:
        sentiment_label = "Negative"
    else:
        sentiment_label = "Mixed/Neutral"

    return {
        "polarity": round(polarity, 3),
        "subjectivity": round(subjectivity, 3),
        "label": sentiment_label,
        "emotions": [{"emotion": e, "score": s, "intensity": "high" if s > 0.3 else "medium" if s > 0.15 else "low"} 
                     for e, s in top_emotions if s > 0.05]
    }

def generate_dream_dna(symbols: List[Dict], sentiment: Dict, entry: DreamEntry) -> Dict[str, Any]:
    """Generate Dream DNA Fingerprint Vector"""
    # 20-dimensional vector encoding dream characteristics
    dna = np.zeros(20)

    # Dimensions 0-4: Archetype distribution
    archetypes = [s["archetype"] for s in symbols]
    archetype_counts = Counter(archetypes)
    dna[0] = archetype_counts.get("emotion", 0) / 5
    dna[1] = archetype_counts.get("freedom", 0) / 5
    dna[2] = archetype_counts.get("insecurity", 0) / 5
    dna[3] = archetype_counts.get("transformation", 0) / 5
    dna[4] = archetype_counts.get("threshold", 0) / 5

    # Dimensions 5-9: Emotional spectrum
    dna[5] = sentiment["polarity"]  # -1 to 1
    dna[6] = sentiment["subjectivity"]
    emotion_map = {"happy": 7, "sad": 8, "anxious": 9, "fear": 9, "excited": 7, "peaceful": 8}
    for emo in sentiment.get("emotions", []):
        if emo["emotion"] in emotion_map:
            dna[emotion_map[emo["emotion"]]] += emo["score"]

    # Dimensions 10-14: Sleep metrics
    dna[10] = entry.sleep_quality / 10
    dna[11] = min(entry.sleep_hours / 12, 1)
    mood_map = {"happy": 12, "excited": 12, "sad": 13, "anxious": 13, "stressed": 13, "neutral": 14, "tired": 14}
    if entry.mood_before_sleep in mood_map:
        dna[mood_map[entry.mood_before_sleep]] = 1

    # Dimensions 15-19: Structural features
    dna[15] = len(entry.description) / 1000  # Length factor
    dna[16] = 1 if entry.lucid else 0
    dna[17] = 1 if entry.recurring else 0
    dna[18] = len(entry.tags) / 10
    dna[19] = len(symbols) / 5

    dna = np.clip(dna, 0, 1)

    # Update user profile
    user_profile["dream_dna_vector"] = (user_profile["dream_dna_vector"] * user_profile["total_dreams"] + dna) / (user_profile["total_dreams"] + 1)

    return {
        "vector": dna.tolist(),
        "dominant_archetype": max(set(archetypes), key=archetypes.count) if archetypes else "unknown",
        "emotional_signature": sentiment["label"],
        "complexity_score": round(sum(dna) / 20, 3),
        "lucidity_marker": bool(dna[16]),
        "recurring_marker": bool(dna[17]),
    }

def generate_interpretation(symbols: List[Dict], sentiment: Dict, entry: DreamEntry) -> str:
    """Neuro-Symbolic Interpretation Generation"""
    if not symbols:
        return "Your dream appears to be a peaceful, uneventful journey through your subconscious. The lack of strong symbolic elements suggests a period of mental rest or processing of everyday experiences."

    # Build narrative
    parts = []

    # Opening based on sentiment
    if sentiment["polarity"] > 0.2:
        parts.append("This dream carries a positive, uplifting energy")
    elif sentiment["polarity"] < -0.2:
        parts.append("This dream reveals underlying tensions or concerns")
    else:
        parts.append("This dream presents a complex emotional landscape")

    # Symbol analysis
    symbol_texts = []
    for s in symbols[:3]:
        meaning = random.choice(s["meanings"])
        context = s["contexts_found"][0] if s["contexts_found"] else "your current life situation"
        if s["personal_frequency"] > 2:
            symbol_texts.append(f"the recurring symbol of '{s['symbol']}' (appearing {s['personal_frequency']} times in your journal) strongly suggests {meaning} in the context of {context}")
        else:
            symbol_texts.append(f"the symbol of '{s['symbol']}' suggests {meaning}, particularly relevant to {context}")

    parts.append(". ".join(symbol_texts))

    # Archetype synthesis
    archetypes = [s["archetype"] for s in symbols]
    if len(set(archetypes)) > 1:
        parts.append(f"The interplay between {', '.join(set(archetypes))} archetypes indicates you're navigating multiple psychological dimensions simultaneously.")

    # Personal context
    if entry.mood_before_sleep in ["stressed", "anxious"]:
        parts.append("Given your pre-sleep emotional state, this dream may be processing unresolved daytime tensions.")
    elif entry.mood_before_sleep in ["happy", "excited"]:
        parts.append("Your positive pre-sleep state likely influenced this dream's constructive, forward-looking nature.")

    # Lucidity insight
    if entry.lucid:
        parts.append("Your lucid awareness within the dream indicates growing metacognitive ability — a powerful tool for self-discovery.")

    # Recurring pattern
    recurring_symbols = [s for s in symbols if s["personal_frequency"] > 1]
    if recurring_symbols:
        parts.append(f"Watch for the pattern of '{recurring_symbols[0]['symbol']}' — recurring symbols often signal important unconscious messages that your mind is trying to deliver.")

    return " ".join(parts)

def detect_similar_dreams(current_entry: DreamEntry, current_symbols: List[str]) -> List[Dict[str, Any]]:
    """Find similar past dreams using symbol overlap"""
    similar = []
    for dream in dreams_db:
        if dream["id"] == current_entry.id:
            continue
        past_symbols = [s["symbol"] for s in dream.get("analysis", {}).get("symbols", [])]
        overlap = set(current_symbols) & set(past_symbols)
        if len(overlap) >= 2:
            similar.append({
                "dream_id": dream["id"],
                "title": dream["title"],
                "date": dream["date"],
                "shared_symbols": list(overlap),
                "similarity_score": round(len(overlap) / max(len(current_symbols), len(past_symbols)), 2)
            })

    return sorted(similar, key=lambda x: x["similarity_score"], reverse=True)[:3]

def detect_dream_signs() -> List[str]:
    """Detect recurring elements that could be lucidity triggers"""
    if len(dreams_db) < 3:
        return []

    all_symbols = []
    for dream in dreams_db:
        all_symbols.extend([s["symbol"] for s in dream.get("analysis", {}).get("symbols", [])])

    freq = Counter(all_symbols)
    dream_signs = [sym for sym, count in freq.items() if count >= 3]
    return dream_signs[:5]

def calculate_lucidity_probability(entry: DreamEntry, symbols: List[Dict]) -> float:
    """Predict lucidity probability based on patterns"""
    score = 0.0

    # Historical lucidity correlation
    lucid_dreams = [d for d in dreams_db if d.get("lucid", False)]
    if lucid_dreams:
        # Check if current symbols match past lucid dream symbols
        lucid_symbols = set()
        for d in lucid_dreams:
            lucid_symbols.update([s["symbol"] for s in d.get("analysis", {}).get("symbols", [])])
        current_sym_set = set(s["symbol"] for s in symbols)
        overlap = len(current_sym_set & lucid_symbols)
        score += overlap * 0.15

    # Sleep quality correlation
    if entry.sleep_quality >= 7:
        score += 0.2

    # Mood correlation
    if entry.mood_before_sleep in ["excited", "happy"]:
        score += 0.1

    # Recurring symbol boost (familiarity = awareness)
    recurring_count = sum(1 for s in symbols if s["personal_frequency"] > 1)
    score += recurring_count * 0.1

    # Lucid intent
    if entry.lucid:
        score += 0.3

    return round(min(score, 0.95), 3)

def generate_explanation_trace(symbols: List[Dict], sentiment: Dict, entry: DreamEntry) -> List[str]:
    """XAI: Generate step-by-step reasoning trace"""
    trace = []
    trace.append(f"STEP 1: Text preprocessing — analyzed {len(entry.description.split())} words")
    trace.append(f"STEP 2: Sentiment analysis — polarity={sentiment['polarity']}, subjectivity={sentiment['subjectivity']}")
    trace.append(f"STEP 3: Symbol extraction — found {len(symbols)} symbols from ontology of {len(SYMBOL_DATABASE)} entries")
    for i, s in enumerate(symbols[:3], 1):
        trace.append(f"STEP 3.{i}: Symbol '{s['symbol']}' — confidence={s['confidence']} (archetype: {s['archetype']}, personal_freq: {s['personal_frequency']})")
    trace.append(f"STEP 4: Dream DNA generation — 20-dim vector computed from archetype, emotion, sleep, and structural features")
    trace.append(f"STEP 5: Personal ontology update — symbol frequencies updated, user profile recalculated")
    trace.append(f"STEP 6: Similarity search — compared against {len(dreams_db)} previous dreams")
    trace.append(f"STEP 7: Lucidity prediction — based on historical patterns, sleep quality, and symbol familiarity")
    trace.append(f"STEP 8: Interpretation synthesis — neuro-symbolic narrative generation complete")
    return trace

def generate_collective_insight(symbols: List[str]) -> Optional[str]:
    """Generate insight based on collective dream patterns (simulated)"""
    # Simulated collective data
    collective_patterns = {
        "water": "38% of dreamers report water dreams during emotional transitions",
        "flying": "Flying dreams spike during periods of career change (collective data: +23%)",
        "falling": "Falling dreams correlate with global uncertainty indices (r=0.34)",
        "door": "Door symbolism peaks in dreams during decision-making periods",
        "snake": "Snake dreams show 15% higher frequency in creative professionals",
    }

    for sym in symbols:
        if sym in collective_patterns:
            return collective_patterns[sym]
    return None

# ═══════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════

@app.post("/api/dreams/analyze", response_model=DreamAnalysis)
async def analyze_dream(entry: DreamEntry):
    """Analyze a dream entry and return full interpretation"""

    # Generate ID if new
    if not entry.id:
        entry.id = hashlib.md5(f"{entry.title}{entry.description}{datetime.now()}".encode()).hexdigest()[:12]
    if not entry.date:
        entry.date = datetime.now().isoformat()

    # ML Pipeline
    sentiment = analyze_sentiment(entry.description)
    symbols = extract_symbols(entry.description)
    dream_dna = generate_dream_dna(symbols, sentiment, entry)
    interpretation = generate_interpretation(symbols, sentiment, entry)
    lucidity_prob = calculate_lucidity_probability(entry, symbols)
    similar_dreams = detect_similar_dreams(entry, [s["symbol"] for s in symbols])
    explanation_trace = generate_explanation_trace(symbols, sentiment, entry)
    collective = generate_collective_insight([s["symbol"] for s in symbols])

    # Check recurring pattern
    recurring_detected = any(s["personal_frequency"] > 1 for s in symbols)

    # Update symbol ontology
    for s in symbols:
        symbol_ontology[s["symbol"]]["count"] += 1
        symbol_ontology[s["symbol"]]["contexts"].append(entry.date)

    # Update user profile
    user_profile["total_dreams"] += 1
    if entry.lucid:
        user_profile["lucid_count"] += 1
    user_profile["symbol_frequencies"].update([s["symbol"] for s in symbols])
    user_profile["emotion_history"].append({
        "date": entry.date,
        "dominant": sentiment["emotions"][0]["emotion"] if sentiment["emotions"] else "neutral",
        "score": sentiment["polarity"]
    })
    if not user_profile["first_entry_date"]:
        user_profile["first_entry_date"] = entry.date
    user_profile["last_entry_date"] = entry.date

    # Store dream
    dream_record = entry.dict()
    dream_record["analysis"] = {
        "sentiment": sentiment,
        "symbols": symbols,
        "dream_dna": dream_dna,
        "interpretation": interpretation,
        "lucidity_probability": lucidity_prob,
        "similar_dreams": similar_dreams,
        "explanation_trace": explanation_trace,
        "collective_insight": collective,
        "recurring_detected": recurring_detected,
    }
    dreams_db.append(dream_record)

    return DreamAnalysis(
        sentiment_score=sentiment["polarity"],
        dominant_emotions=sentiment["emotions"],
        extracted_symbols=symbols,
        dream_dna=dream_dna,
        interpretation=interpretation,
        lucidity_probability=lucidity_prob,
        recurring_pattern_detected=recurring_detected,
        similar_past_dreams=similar_dreams,
        explanation_trace=explanation_trace,
        collective_insight=collective
    )

@app.get("/api/dreams", response_model=List[Dict[str, Any]])
async def get_all_dreams():
    """Get all dream entries"""
    return sorted(dreams_db, key=lambda x: x.get("date", ""), reverse=True)

@app.get("/api/dreams/{dream_id}")
async def get_dream(dream_id: str):
    """Get specific dream by ID"""
    for dream in dreams_db:
        if dream["id"] == dream_id:
            return dream
    raise HTTPException(status_code=404, detail="Dream not found")

@app.delete("/api/dreams/{dream_id}")
async def delete_dream(dream_id: str):
    """Delete a dream entry"""
    global dreams_db
    dreams_db = [d for d in dreams_db if d["id"] != dream_id]
    return {"message": "Dream deleted"}

@app.get("/api/stats", response_model=UserStats)
async def get_user_stats():
    """Get comprehensive user statistics and Dream DNA"""
    if not dreams_db:
        return UserStats(
            total_dreams=0,
            lucid_dreams=0,
            recurring_symbols=[],
            dream_dna_fingerprint={"vector": [0]*20, "status": "insufficient_data"},
            emotion_timeline=[],
            symbol_evolution=[],
            avg_sleep_quality=0,
            avg_sleep_hours=0,
            dream_signs=[],
            streak_days=0
        )

    # Calculate stats
    avg_sleep = sum(d["sleep_quality"] for d in dreams_db) / len(dreams_db)
    avg_hours = sum(d["sleep_hours"] for d in dreams_db) / len(dreams_db)

    # Recurring symbols
    top_symbols = [
        {"symbol": sym, "count": count, "percentage": round(count/len(dreams_db)*100, 1)}
        for sym, count in user_profile["symbol_frequencies"].most_common(5)
    ]

    # Emotion timeline
    emotion_timeline = [
        {"date": e["date"], "emotion": e["dominant"], "score": e["score"]}
        for e in user_profile["emotion_history"][-30:]  # Last 30
    ]

    # Symbol evolution (track symbol frequency over time)
    symbol_evolution = []
    for sym, data in symbol_ontology.items():
        if data["count"] >= 2:
            symbol_evolution.append({
                "symbol": sym,
                "frequency": data["count"],
                "first_seen": data["contexts"][0] if data["contexts"] else None,
                "last_seen": data["contexts"][-1] if data["contexts"] else None,
                "trend": "increasing" if data["count"] > 3 else "stable"
            })

    # Streak calculation
    streak = len(dreams_db)  # Simplified for demo

    return UserStats(
        total_dreams=len(dreams_db),
        lucid_dreams=user_profile["lucid_count"],
        recurring_symbols=top_symbols,
        dream_dna_fingerprint={
            "vector": user_profile["dream_dna_vector"].tolist(),
            "dominant_archetype": max(set([s["archetype"] for d in dreams_db for s in d.get("analysis", {}).get("symbols", [])]), 
                                     key=lambda x: sum(1 for d in dreams_db for s in d.get("analysis", {}).get("symbols", []) if s["archetype"]==x)) if dreams_db else "unknown",
            "evolution_stage": "emerging" if len(dreams_db) < 5 else "developing" if len(dreams_db) < 15 else "mature"
        },
        emotion_timeline=emotion_timeline,
        symbol_evolution=symbol_evolution,
        avg_sleep_quality=round(avg_sleep, 1),
        avg_sleep_hours=round(avg_hours, 1),
        dream_signs=detect_dream_signs(),
        streak_days=streak
    )

@app.get("/api/symbols")
async def get_symbol_ontology():
    """Get the full symbol knowledge base"""
    return dict(symbol_ontology)

@app.post("/api/dreams/seed")
async def seed_sample_data():
    """Seed with sample dreams for demo purposes"""
    sample_dreams = [
        {
            "title": "The Red Door",
            "description": "I found myself standing before a massive red door in an empty hallway. The door was slightly ajar, and warm light spilled from the crack. I felt both excited and terrified to open it. As I reached for the handle, I realized I was dreaming and tried to push the door open with my mind. It slowly creaked open revealing a beautiful garden.",
            "mood_before_sleep": "anxious",
            "sleep_quality": 6,
            "sleep_hours": 6.5,
            "tags": ["lucid", "door", "garden", "red"],
            "lucid": True,
            "recurring": True
        },
        {
            "title": "Flying Over the Ocean",
            "description": "I was flying high above a vast blue ocean, the wind rushing through my hair. Below me, dolphins were leaping through the waves. I felt completely free and powerful. The water was crystal clear and I could see deep into its depths. Suddenly I started falling but caught myself just before hitting the surface.",
            "mood_before_sleep": "excited",
            "sleep_quality": 8,
            "sleep_hours": 7.5,
            "tags": ["flying", "ocean", "freedom"],
            "lucid": False,
            "recurring": False
        },
        {
            "title": "The Snake in the Garden",
            "description": "In my childhood garden, a large green snake was coiled around the old oak tree. It wasn't threatening — it seemed wise and ancient. It looked at me with knowing eyes and I felt it was trying to tell me something important about change. The snake began to shed its skin and beneath was a shimmering golden surface.",
            "mood_before_sleep": "neutral",
            "sleep_quality": 7,
            "sleep_hours": 8.0,
            "tags": ["snake", "garden", "transformation"],
            "lucid": False,
            "recurring": True
        },
        {
            "title": "Lost in the School",
            "description": "I was back in high school but couldn't remember my locker combination. I wandered the halls feeling increasingly anxious. Everyone else seemed to know exactly where they were going. I kept ending up in the same empty classroom with a blackboard covered in equations I couldn't understand.",
            "mood_before_sleep": "stressed",
            "sleep_quality": 4,
            "sleep_hours": 5.5,
            "tags": ["school", "lost", "anxiety"],
            "lucid": False,
            "recurring": False
        },
        {
            "title": "The Mirror Room",
            "description": "I entered a room full of mirrors. Each reflection showed a different version of me — some older, some younger, some completely different. One mirror showed me with wings. Another showed me underwater breathing easily. I touched one mirror and my hand passed through into a warm, glowing space.",
            "mood_before_sleep": "tired",
            "sleep_quality": 7,
            "sleep_hours": 7.0,
            "tags": ["mirror", "identity", "mystical"],
            "lucid": False,
            "recurring": False
        },
    ]

    for dream_data in sample_dreams:
        entry = DreamEntry(**dream_data)
        await analyze_dream(entry)

    return {"message": f"Seeded {len(sample_dreams)} sample dreams", "total_dreams": len(dreams_db)}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "dreams_count": len(dreams_db), "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
