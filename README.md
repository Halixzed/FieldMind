# FieldMind — On-Device Agricultural AI · MVP

> Local-first AI for allotment farmers. Soil sensors → on-device AI → crop recommendations. No cloud. No data leaves the site.

---

## Quick Start (5 minutes)

### 1. Prerequisites

- **Python 3.10+** — `python3 --version`
- **Ollama** (optional but recommended for real AI) — https://ollama.ai
- **VS Code** with Python extension

### 2. Run everything

```bash
cd fieldmind
bash setup.sh
```

Then open **http://localhost:3000** in your browser.

---

## Manual Setup (if setup.sh doesn't work)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
python3 -m http.server 3000
# open http://localhost:3000
```

### Ollama (local AI)

```bash
# Install Ollama from https://ollama.ai, then:
ollama pull phi3:mini       # ~2.3GB download
ollama serve                # starts on port 11434
```

If Ollama is not running, the backend automatically falls back to rule-based recommendations — the demo still works.

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Farmer's device (browser)      │
│         http://localhost:3000            │
└───────────────┬─────────────────────────┘
                │ HTTP
┌───────────────▼─────────────────────────┐
│       FieldMind Backend (FastAPI)        │
│            localhost:8000                │
│                                          │
│  • Sensor simulation (or real MQTT)      │
│  • Weather forecast (mock/API)           │
│  • AI inference orchestration            │
│  • Learning observation logger           │
└───────────────┬─────────────────────────┘
                │ HTTP
┌───────────────▼─────────────────────────┐
│           Ollama (local LLM)             │
│           localhost:11434                │
│           Model: phi3:mini               │
└─────────────────────────────────────────┘
```

**Everything runs on one machine. No internet required after setup.**

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/sensors/current` | GET | Latest sensor readings |
| `/sensors/history?limit=48` | GET | Sensor history (up to 288 points) |
| `/sensors/override` | POST | Override sensor values (demo) |
| `/weather/forecast` | GET | 7-day forecast |
| `/ai/recommend` | GET | AI crop recommendation |
| `/learning/observe` | POST | Log crop outcome for training |
| `/learning/observations` | GET | All logged observations |
| `/health` | GET | Service health check |
| `/docs` | GET | Interactive API docs (Swagger) |

---

## Connecting Real Sensors

Replace the `SensorState.update()` simulation in `backend/main.py` with real MQTT:

```python
import paho.mqtt.client as mqtt

def on_message(client, userdata, msg):
    data = json.loads(msg.payload)
    sensor.moisture = data['moisture']
    sensor.nitrogen = data['nitrogen']
    # ... etc

client = mqtt.Client()
client.on_message = on_message
client.connect("localhost", 1883)
client.subscribe("allotment/sensors/#")
client.loop_start()
```

Your Raspberry Pi Pico W sends MQTT messages over WiFi to this broker.

---

## Switching AI Models

Edit `backend/main.py` — change the model name:

```python
"model": "phi3:mini",        # 2.3GB — fastest, runs on 4GB RAM
"model": "mistral:7b-q4",    # 4.1GB — smarter, needs 8GB RAM  
"model": "llama3:8b",        # 4.7GB — best quality, needs 8GB RAM
```

Pull models with: `ollama pull mistral:7b-q4`

---

## Continual Learning (Roadmap)

Current MVP logs observations to memory. Production path:
1. Observations saved to SQLite with sensor state at planting time
2. Nightly cron job runs LoRA fine-tuning on observation pairs
3. Updated LoRA adapter loaded into Ollama
4. Model improves with every season's data

---

## Hardware for Deployment

| Board | RAM | Cost | AI Speed |
|---|---|---|---|
| Raspberry Pi 5 | 8GB | £80 | Rules only |
| Orange Pi 5 Plus | 16GB | £130 | phi3:mini ~10 tok/s |
| Beelink EQ12 | 32GB | £180 | phi3:mini ~15 tok/s ✓ |
| Jetson Orin NX | 16GB | £500 | mistral-7b full |

**Recommended for demo**: Any laptop or mini PC with 8GB+ RAM.
**Recommended for production**: Orange Pi 5 Plus + LoRa sensors.
