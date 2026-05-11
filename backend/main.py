"""
Verdara Backend — Production v2.0
FastAPI + Supabase (JWT auth + PostgreSQL persistence)

Start:
  cp .env.example .env  # fill in your Supabase credentials
  uvicorn main:app --reload --port 8000
"""

import asyncio
import json
import logging
import math
import os
import random
import time
from datetime import datetime, timedelta
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import Client, create_client

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration — all values sourced from .env, never hardcoded
# ---------------------------------------------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. "
        "In Railway: go to your service → Variables tab and add these two variables."
    )
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3:mini")
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if o.strip()
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("verdara")

# ---------------------------------------------------------------------------
# Supabase — service-role client (server-side only, never sent to frontend)
# ---------------------------------------------------------------------------

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
log.info("Supabase client ready → %s", SUPABASE_URL)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Verdara API", version="2.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ---------------------------------------------------------------------------
# Auth dependency — verifies Supabase JWT on every protected request
# ---------------------------------------------------------------------------


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        result = supabase.auth.get_user(token)
        if not result or not result.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return result.user
    except HTTPException:
        raise
    except Exception as exc:
        log.warning("Auth rejected: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ---------------------------------------------------------------------------
# Sensor simulation — realistic drift with diurnal + nutrient variation
# ---------------------------------------------------------------------------


class SensorState:
    def __init__(self):
        self.moisture = 62.0
        self.nitrogen = 48.0
        self.phosphorus = 31.0
        self.potassium = 74.0
        self.soil_temp = 14.0
        self.air_temp = 16.0
        self.humidity = 68.0
        self.ph = 6.5
        self.last_rain = time.time() - 7200  # 2 h ago
        self.history: list = []
        self._tick = 0

    def update(self):
        self._tick += 1
        hour = datetime.now().hour
        temp_curve = math.sin((hour - 6) * math.pi / 12) * 4
        self.soil_temp = max(4, min(28, 14 + temp_curve + random.gauss(0, 0.3)))
        self.air_temp = self.soil_temp + random.gauss(2, 0.5)

        evap = 0.05 if self.soil_temp > 15 else 0.02
        self.moisture = max(10, min(98, self.moisture - evap + random.gauss(0, 0.4)))

        if random.random() < 0.003:
            self.moisture = min(98, self.moisture + random.uniform(8, 20))
            self.last_rain = time.time()

        self.nitrogen = max(5, min(120, self.nitrogen + random.gauss(0, 0.2)))
        self.phosphorus = max(5, min(80, self.phosphorus + random.gauss(0, 0.15)))
        self.potassium = max(10, min(150, self.potassium + random.gauss(0, 0.25)))
        self.humidity = max(30, min(98, self.humidity + random.gauss(0, 0.8)))
        self.ph = max(5.0, min(8.0, self.ph + random.gauss(0, 0.01)))

        reading = self.snapshot()
        self.history.append(reading)
        if len(self.history) > 288:  # keep 24 h at 5-min intervals
            self.history.pop(0)
        return reading

    def snapshot(self) -> dict:
        return {
            "timestamp": datetime.now().isoformat(),
            "moisture": round(self.moisture, 1),
            "nitrogen": round(self.nitrogen, 1),
            "phosphorus": round(self.phosphorus, 1),
            "potassium": round(self.potassium, 1),
            "soil_temp": round(self.soil_temp, 1),
            "air_temp": round(self.air_temp, 1),
            "humidity": round(self.humidity, 1),
            "ph": round(self.ph, 2),
            "hours_since_rain": round((time.time() - self.last_rain) / 3600, 1),
        }


sensor = SensorState()
_persist_counter = 0


@app.on_event("startup")
async def start_background_tasks():
    asyncio.create_task(sensor_tick_loop())
    log.info("Sensor simulation started")


async def sensor_tick_loop():
    global _persist_counter
    while True:
        sensor.update()
        _persist_counter += 1
        if _persist_counter % 12 == 0:  # flush to DB every ~60 s
            _persist_sensor_reading()
        await asyncio.sleep(5)


def _persist_sensor_reading():
    snap = sensor.snapshot()
    try:
        supabase.table("sensor_readings").insert(
            {
                "moisture": snap["moisture"],
                "nitrogen": snap["nitrogen"],
                "phosphorus": snap["phosphorus"],
                "potassium": snap["potassium"],
                "soil_temp": snap["soil_temp"],
                "air_temp": snap["air_temp"],
                "humidity": snap["humidity"],
                "ph": snap["ph"],
                "hours_since_rain": snap["hours_since_rain"],
            }
        ).execute()
    except Exception as exc:
        log.warning("Sensor persistence failed: %s", exc)


# ---------------------------------------------------------------------------
# Sensor endpoints
# ---------------------------------------------------------------------------


@app.get("/sensors/current")
def get_current_sensors(user=Depends(get_current_user)):
    return sensor.snapshot()


@app.get("/sensors/history")
def get_sensor_history(limit: int = 48, user=Depends(get_current_user)):
    try:
        result = (
            supabase.table("sensor_readings")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        if result.data:
            # Return chronological order (oldest first)
            return list(reversed(result.data))
    except Exception as exc:
        log.warning("DB history query failed, falling back to in-memory: %s", exc)
    return sensor.history[-limit:]


@app.post("/sensors/override")
def override_sensors(
    moisture: Optional[float] = None,
    nitrogen: Optional[float] = None,
    phosphorus: Optional[float] = None,
    potassium: Optional[float] = None,
    soil_temp: Optional[float] = None,
    user=Depends(get_current_user),
):
    if moisture is not None:
        sensor.moisture = moisture
    if nitrogen is not None:
        sensor.nitrogen = nitrogen
    if phosphorus is not None:
        sensor.phosphorus = phosphorus
    if potassium is not None:
        sensor.potassium = potassium
    if soil_temp is not None:
        sensor.soil_temp = soil_temp
    return {"status": "ok", "sensors": sensor.snapshot()}


# ---------------------------------------------------------------------------
# Weather — 7-day mock forecast (cached 10 min)
# ---------------------------------------------------------------------------

WEATHER_CONDITIONS = [
    ("Sunny", "☀", 0),
    ("Partly cloudy", "⛅", 1),
    ("Overcast", "☁", 0),
    ("Light rain", "🌧", 8),
    ("Showers", "🌦", 12),
    ("Heavy rain", "⛈", 22),
    ("Drizzle", "🌂", 4),
]

_forecast_cache: dict = {"data": None, "generated": 0}


def _build_forecast() -> list:
    base_temp = 15 + random.gauss(0, 3)
    forecast = []
    for i in range(7):
        date = datetime.now() + timedelta(days=i)
        condition = random.choice(WEATHER_CONDITIONS)
        temp = round(base_temp + random.gauss(0, 2.5), 1)
        forecast.append(
            {
                "day": date.strftime("%a"),
                "date": date.strftime("%d %b"),
                "condition": condition[0],
                "icon": condition[1],
                "rainfall_mm": condition[2] + round(random.uniform(0, 5), 1),
                "temp_high": temp + round(random.uniform(1, 4), 1),
                "temp_low": temp - round(random.uniform(2, 5), 1),
                "wind_mph": round(random.uniform(3, 25), 1),
                "humidity_pct": round(random.uniform(55, 92), 1),
            }
        )
    return forecast


def _get_cached_forecast() -> list:
    if not _forecast_cache["data"] or time.time() - _forecast_cache["generated"] > 600:
        _forecast_cache["data"] = _build_forecast()
        _forecast_cache["generated"] = time.time()
    return _forecast_cache["data"]


@app.get("/weather/forecast")
def get_weather(user=Depends(get_current_user)):
    return {"forecast": _get_cached_forecast(), "location": "Nottinghamshire, UK"}


# ---------------------------------------------------------------------------
# AI recommendation — Ollama → Supabase persistence → rule-based fallback
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are Verdara, an expert agricultural AI assistant running entirely on-device on a local compute board installed at a UK allotment. You have access to real-time soil sensor data and weather forecasts.

Your job is to give practical, actionable farming advice. Always:
- Recommend specific crops to plant RIGHT NOW based on sensor data
- Estimate yield percentage (0-100%) for each recommended crop
- Flag any soil issues and suggest organic amendments
- Consider the weather forecast in your advice
- Mention realistic UK market prices when relevant
- Keep advice concise and practical — farmers are busy
- Format your JSON response exactly as specified

You must respond ONLY with valid JSON — no markdown, no explanation outside the JSON.
"""

USER_PROMPT_TEMPLATE = """Current soil sensor readings:
- Soil moisture: {moisture}%
- Nitrogen (N): {nitrogen} mg/kg
- Phosphorus (P): {phosphorus} mg/kg
- Potassium (K): {potassium} mg/kg
- Soil temperature: {soil_temp}°C
- Air temperature: {air_temp}°C
- Humidity: {humidity}%
- Soil pH: {ph}
- Hours since last rain: {hours_since_rain}h

7-day weather outlook: {weather_summary}

Today's date: {today}
Location: UK allotment, Nottinghamshire

Respond ONLY with this exact JSON structure:
{{
  "alert": {{
    "level": "ok|warning|danger|info",
    "message": "one sentence alert or null"
  }},
  "recommendation": "2-3 sentence main recommendation paragraph",
  "crops": [
    {{
      "name": "Crop Name",
      "action": "plant now|delay Xwk|not recommended",
      "days_to_harvest": 65,
      "yield_pct": 82,
      "reason": "brief reason"
    }}
  ],
  "amendments": ["amendment 1", "amendment 2"],
  "market_note": "one sentence about current market prices/timing"
}}"""


@app.get("/ai/recommend")
async def get_ai_recommendation(
    moisture: Optional[float] = None,
    nitrogen: Optional[float] = None,
    soil_temp: Optional[float] = None,
    user=Depends(get_current_user),
):
    snap = sensor.snapshot()
    if moisture is not None:
        snap["moisture"] = moisture
    if nitrogen is not None:
        snap["nitrogen"] = nitrogen
    if soil_temp is not None:
        snap["soil_temp"] = soil_temp

    forecast = _get_cached_forecast()
    total_rain = sum(d["rainfall_mm"] for d in forecast)
    avg_temp = sum(d["temp_high"] for d in forecast) / len(forecast)
    weather_summary = (
        f"{forecast[0]['condition']} today, "
        f"{round(total_rain, 0)}mm rain expected over 7 days, "
        f"avg high {round(avg_temp, 1)}°C"
    )

    prompt = USER_PROMPT_TEMPLATE.format(
        **snap,
        weather_summary=weather_summary,
        today=datetime.now().strftime("%A %d %B %Y"),
    )

    result = None
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{OLLAMA_HOST}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "system": SYSTEM_PROMPT,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 800},
                },
            )
            raw = response.json().get("response", "").strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            if raw.endswith("```"):
                raw = raw[:-3]
            ai_data = json.loads(raw.strip())
            result = {"source": f"ollama:{OLLAMA_MODEL}", "sensors": snap, "ai": ai_data}

    except httpx.ConnectError:
        result = _fallback_recommendation(snap)
    except (json.JSONDecodeError, KeyError):
        result = _fallback_recommendation(snap)

    # Persist the recommendation for this user
    try:
        supabase.table("ai_recommendations").insert(
            {
                "user_id": str(user.id),
                "sensors": snap,
                "recommendation": result["ai"],
                "source": result["source"],
            }
        ).execute()
    except Exception as exc:
        log.warning("Failed to persist AI recommendation: %s", exc)

    return result


def _fallback_recommendation(snap: dict) -> dict:
    m, n, t, p = snap["moisture"], snap["nitrogen"], snap["soil_temp"], snap["phosphorus"]

    if m < 25:
        alert = {"level": "danger", "message": "Critical: soil moisture dangerously low — irrigate immediately."}
    elif t < 8:
        alert = {"level": "info", "message": f"Soil temp {t}°C is too cold for warm-season crops — focus on brassicas."}
    elif n > 80:
        alert = {"level": "warning", "message": f"High nitrogen ({n} mg/kg) — favour fruiting crops over leafy greens."}
    elif p < 25:
        alert = {"level": "warning", "message": "Phosphorus low — apply organic bone meal before next planting."}
    else:
        alert = {"level": "ok", "message": None}

    crops = []
    if t >= 10 and m >= 40:
        crops.append({"name": "Courgette", "action": "plant now", "days_to_harvest": 65,
                      "yield_pct": min(92, int(70 + (m - 40) * 0.5 + (t - 10) * 1.5)),
                      "reason": "Soil temp and moisture optimal"})
        crops.append({"name": "French Beans", "action": "plant now", "days_to_harvest": 58,
                      "yield_pct": min(88, int(68 + (m - 40) * 0.4)),
                      "reason": "Good germination conditions"})
    if t < 8 or p < 20:
        crops.append({"name": "Winter Brassica", "action": "delay 2wk", "days_to_harvest": 90,
                      "yield_pct": 54, "reason": "Low phosphorus or temp — needs amendment first"})
    else:
        crops.append({"name": "Winter Brassica", "action": "plant now", "days_to_harvest": 90,
                      "yield_pct": 71, "reason": "Conditions acceptable"})
    crops.append({"name": "Tomatoes",
                  "action": "plant now" if t >= 12 else "delay 1wk",
                  "days_to_harvest": 75,
                  "yield_pct": 79 if t >= 12 else 62,
                  "reason": "Good all-round conditions" if t >= 12 else "Wait for warmer soil"})

    if m < 25:
        rec = "Soil moisture is critically low — do not plant anything new. Run irrigation for 45 minutes, then re-test."
    elif t < 8:
        rec = f"At {t}°C soil temp, warm-season crops will fail. Kale, leeks, and spinach are your best bet right now."
    else:
        rec = (f"Conditions are broadly good — plant courgettes and French beans this week. "
               f"Moisture at {m}% is healthy. Consider bone meal to boost phosphorus before the brassica window.")

    return {
        "source": "fallback:rules",
        "sensors": snap,
        "ai": {
            "alert": alert,
            "recommendation": rec,
            "crops": crops,
            "amendments": ["Organic bone meal (P boost)", "Seaweed feed (trace minerals)"] if p < 35 else ["Balanced NPK liquid feed"],
            "market_note": "Courgettes currently £1.20/kg wholesale; French beans £2.10/kg — both strong margins.",
        },
    }


# ---------------------------------------------------------------------------
# Learning observations — persisted to Supabase per user
# ---------------------------------------------------------------------------


class Observation(BaseModel):
    sensors: dict
    crop_planted: str
    actual_yield_pct: Optional[float] = None
    notes: Optional[str] = None


@app.post("/learning/observe")
def log_observation(obs: Observation, user=Depends(get_current_user)):
    try:
        supabase.table("observations").insert(
            {
                "user_id": str(user.id),
                "sensors": obs.sensors,
                "crop_planted": obs.crop_planted,
                "actual_yield_pct": obs.actual_yield_pct,
                "notes": obs.notes,
            }
        ).execute()
        count_result = (
            supabase.table("observations")
            .select("id", count="exact")
            .eq("user_id", str(user.id))
            .execute()
        )
        return {"status": "logged", "total_observations": count_result.count or 0}
    except Exception as exc:
        log.error("Failed to log observation: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save observation")


@app.get("/learning/observations")
def get_observations(user=Depends(get_current_user)):
    try:
        result = (
            supabase.table("observations")
            .select("*")
            .eq("user_id", str(user.id))
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        return {"observations": result.data, "count": len(result.data)}
    except Exception as exc:
        log.error("Failed to fetch observations: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch observations")


# ---------------------------------------------------------------------------
# Health check — unauthenticated, used by load balancers / uptime monitors
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
    }
