# 🌙 Somnium — AI Dream Journal

**Neuro-Symbolic Dream Analysis with Explainable AI**

A unique ML project that combines natural language processing, symbolic reasoning, and explainable AI to analyze dreams and generate personalized interpretations.

---

## 🚀 Quick Start (For Your Expo Tomorrow!)

### Step 1: Start the Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download TextBlob data
python -m textblob.download_corpora

# Run the server
python main.py
```

The backend will start at **http://localhost:8000**

You should see: `Uvicorn running on http://0.0.0.0:8000`

### Step 2: Start the Frontend

Open `frontend/index.html` in your browser:

- **Option A:** Double-click `frontend/index.html`
- **Option B:** Use Live Server extension in VS Code
- **Option C:** `cd frontend && python -m http.server 3000` then open `http://localhost:3000`

### Step 3: Seed Demo Data

Click the **🌱 Seed Data** button in the top right to load 5 sample dreams instantly.

---

## 📁 Project Structure

```
somnium/
├── backend/
│   ├── main.py              # FastAPI server + ML pipeline
│   └── requirements.txt     # Python dependencies
└── frontend/
    ├── index.html           # Main HTML page
    ├── styles.css           # Dark mystical theme
    └── app.js               # Interactive frontend logic
```

---

## 🧠 What Makes This Project Unique

| Feature | Description |
|---------|-------------|
| **Neuro-Symbolic AI** | Combines neural NLP with symbolic knowledge graphs |
| **Dream DNA** | 20-dimensional vector fingerprint of your subconscious |
| **XAI Explainability** | Every interpretation shows step-by-step reasoning |
| **Personal Ontology** | Learns YOUR symbols, not generic meanings |
| **Lucidity Prediction** | ML model predicts lucid dream probability |
| **Pattern Matching** | Finds similar dreams across your journal |
| **Collective Insights** | Compares with global dream patterns |

---

## 🎯 ML Pipeline (5 Steps)

1. **Text Preprocessing** → Tokenization, cleaning
2. **Sentiment Analysis** → TextBlob polarity + custom emotion lexicon
3. **Symbol Extraction** → Neuro-symbolic matching against 20 archetypes
4. **Dream DNA Generation** → 20-dim vector (archetype, emotion, sleep, structure)
5. **Interpretation Synthesis** → Personalized narrative generation

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check server status |
| `/api/dreams` | GET | List all dreams |
| `/api/dreams/analyze` | POST | Analyze a new dream |
| `/api/dreams/{id}` | GET | Get specific dream |
| `/api/dreams/{id}` | DELETE | Delete a dream |
| `/api/stats` | GET | User statistics & Dream DNA |
| `/api/symbols` | GET | Symbol ontology |
| `/api/dreams/seed` | POST | Load demo data |

---

## 💡 Demo Flow for Expo

1. **Show the empty journal** → Explain the concept
2. **Click "Seed Data"** → 5 dreams appear instantly
3. **Click a dream card** → Show the detailed analysis modal
4. **Go to "Analyze" tab** → Enter a new dream and analyze it
5. **Show the result panel** → Sentiment, symbols, interpretation, Dream DNA
6. **Go to "Dream DNA" tab** → Show the radar chart visualization
7. **Go to "Insights" tab** → Show statistics, emotion timeline, dream signs
8. **Go to "Ontology" tab** → Explain the 20-symbol knowledge base

---

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python web framework)
- TextBlob (NLP sentiment analysis)
- NumPy (vector operations)
- Pydantic (data validation)

**Frontend:**
- Vanilla JavaScript (no frameworks needed!)
- CSS Grid & Flexbox
- SVG Radar Charts
- Fetch API

---

## 🎨 Design Philosophy

- **Dark theme** — represents the subconscious/unconscious
- **Purple accents** — mystical, dream-like atmosphere
- **Cormorant Garamond** — elegant serif for dream text
- **Inter** — clean sans-serif for data/UI
- **Glassmorphism** — modern, ethereal feel

---

## 📝 For Your Expo Presentation

**Opening Hook:**
> "What if your dreams could talk back to you? Somnium is not just a dream journal — it's a cognitive mirror that uses neuro-symbolic AI to study your subconscious and explain WHY it thinks what it thinks."

**Key Talking Points:**
1. Most dream apps use generic symbolism (Freud/Jung dictionaries)
2. Somnium learns YOUR personal symbol meanings over time
3. Every interpretation is explainable (XAI trace)
4. Dream DNA creates a unique fingerprint of your subconscious
5. Lucidity prediction helps you become aware in dreams

**Live Demo Script:**
1. Show empty state → "This is where your journey begins"
2. Seed data → "Let me show you what 5 dreams look like"
3. Click "The Red Door" → "Notice the lucid badge and recurring symbol"
4. Analyze tab → "Now let's analyze a NEW dream live"
5. Enter dream text with "water, flying, falling" → "Watch the symbols extract in real-time"
6. Show result → "Sentiment gauge, extracted symbols, AI interpretation, Dream DNA bars"
7. DNA tab → "This radar chart is your unique subconscious fingerprint"
8. Insights tab → "Emotion timeline shows your psychological trends"
9. Ontology tab → "20 archetypes from Jungian psychology power the analysis"

---

## 🐛 Troubleshooting

**Backend won't start?**
```bash
# Make sure you're in the backend directory
cd somnium/backend

# Check Python version (need 3.8+)
python --version

# If port 8000 is busy
python main.py --port 8001
# Then update API_BASE in frontend/app.js
```

**Frontend shows "Disconnected"?**
- Make sure backend is running first
- Check browser console for CORS errors
- Try opening `index.html` directly (no server needed for static files)

**TextBlob download fails?**
```bash
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"
```

---

## 📄 License

Made for educational purposes. Feel free to extend and customize!

---

**Good luck with your expo! 🌟**
