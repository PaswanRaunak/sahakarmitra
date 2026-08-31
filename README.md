# सहकारमित्र · SahakarMitra

**Multilingual AI chatbot for cooperative governance and legal assistance**
Smart India Hackathon 2026 · Problem Statement **SIH26088** (Ministry of Cooperation)

SahakarMitra lets members and officials of Indian cooperative societies ask
legal/compliance questions in **English / हिंदी / मराठी** and get a grounded,
citation-backed answer — never an AI guess. It uses **Retrieval-Augmented
Generation (RAG)**: the user's question is embedded, matched against a vector
database of cooperative law chunks, and the top matches are passed to an LLM
with strict "answer only from this text" instructions.

---

## Tech Stack

| Layer        | Tech                                                      | Why                                             |
|--------------|-----------------------------------------------------------|-------------------------------------------------|
| Frontend     | React 18 + Vite + Tailwind CSS                            | Fast dev loop, zero magic, easy to demo         |
| Backend      | Node.js + Express                                         | Tiny, comment-friendly, easy to walk through    |
| Vector DB    | ChromaDB (local server, `chromadb` npm client)            | Free, local, purpose-built for RAG              |
| Embeddings   | `Xenova/all-MiniLM-L6-v2` via `@xenova/transformers`       | Pure-JS, runs locally, ~90 MB model, free       |
| LLM          | Groq API (`llama-3.1-8b-instant`)                         | Free tier, fast inference                       |
| Hosting      | Vercel (frontend) + Render (backend) — later              | Both have free tiers                            |

**Zero paid services. Everything runs locally for the demo.**

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER (React)                         │
│  ┌─────────────┐  ┌───────────────────────┐  ┌────────────────────┐  │
│  │ Language    │  │  Chat UI (messages,   │  │ Example chips +    │  │
│  │ selector   │  │  citations, examples)  │  │ input box          │  │
│  └─────────────┘  └───────────────────────┘  └────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ POST /api/chat { message, language }
                            │ (Vite dev proxy → http://localhost:5000)
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       EXPRESS BACKEND (Node)                          │
│                                                                      │
│   routes/chat.js                                                     │
│     1. Validate request                                               │
│     2. Call services/embeddings.js → 384-dim query vector            │
│     3. Call services/retrieval.js  → query ChromaDB, top-3 chunks     │
│     4. Call services/llm.js       → Groq API with grounded prompt    │
│     5. Return { answer, sources[] }                                   │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
        ┌───────────────────┴────────────────────┐
        ▼                                       ▼
┌────────────────────────┐              ┌──────────────────────────┐
│  ChromaDB (server)      │              │  Groq API (LLM)          │
│  Collection:            │              │  llama-3.1-8b-instant     │
│  sahakarmitra_laws      │              │                          │
│  (top-3 cosine match)   │              │  System prompt:          │
└───────────▲────────────┘              │  "Answer ONLY from the   │
            │                           │   retrieved text. Cite.  │
            │                           │   If unsure, say so."    │
            │                           └──────────────────────────┘
            │ populate (one-time, npm run ingest)
            │
┌───────────┴────────────┐    ┌─────────────────────────┐
│  ingest.js             │ ←──│  backend/data/*.txt     │
│  Chunk (~250 words) →  │    │  Placeholder sections    │
│  Embed (MiniLM-L6-v2) → │   │  of Maharashtra         │
│  Add to ChromaDB       │    │  Cooperative Societies  │
└────────────────────────┘    │  Act, 1960 (topics:     │
                              │  elections, rights,     │
                              │  disputes, registration,│
                              │  auditing, winding up)  │
                              └─────────────────────────┘
```

---

## Prerequisites

| Tool             | Version   | Why                                           |
|------------------|-----------|-----------------------------------------------|
| Node.js          | ≥ 18      | Runs frontend + backend                       |
| Python           | ≥ 3.9     | Only needed to run the ChromaDB server        |
| A free Groq API key | —      | Get one at <https://console.groq.com/keys>    |

---

## Setup

### 1. Clone & install dependencies

```bash
# from the project root (the folder containing this README)
cd backend  && npm install  && cd ..
cd frontend && npm install  && cd ..
```

### 2. Add your Groq API key

```bash
cp backend/.env.example backend/.env
# then edit backend/.env and replace:
#   GROQ_API_KEY=your_groq_api_key_here
# with your real key from https://console.groq.com/keys
```

### 3. Start the ChromaDB server (in its own terminal)

```bash
pip install chromadb
# Run it once; leave the terminal open. Data is stored in ./chroma_data.
chroma run --path ./chroma_data --port 8000
```

You should see something like `Running chroma server at http://localhost:8000`.

### 4. Ingest the legal text into ChromaDB (one-time)

```bash
cd backend
npm run ingest
# Expected output:
#   ── SahakarMitra ingestion ──
#   Found 6 text file(s): elections.txt, member_rights.txt, ...
#   Loading embedding model: Xenova/all-MiniLM-L6-v2 ...
#   - elections.txt: 2 chunk(s)
#   - member_rights.txt: 4 chunk(s)
#   ...
#   ✅ Ingested N chunks from 6 document(s) into ChromaDB.
```

### 5. Start the backend (in its own terminal)

```bash
cd backend
npm run dev
# SahakarMitra backend running on http://localhost:5000
```

### 6. Start the frontend (in its own terminal)

```bash
cd frontend
npm run dev
# Vite dev server: http://localhost:5173
```

Open <http://localhost:5173> in your browser, pick a language, click an
example chip (or type your own question), and you should get a grounded
answer with collapsible source citations.

---

## Smoke-testing the API without the UI

Once the backend is running, you can hit it directly with curl:

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How can I contest society elections?", "language": "en"}'
```

Expected response (truncated):

```json
{
  "answer": "According to Section 73B: Right to contest elections, ...",
  "sources": [
    {
      "section": "Section 73: Conduct of elections to the committee",
      "source_file": "elections.txt",
      "excerpt": "PLACEHOLDER TEXT — ... (1) The election of the members..."
    }
  ]
}
```

---

## Project Structure

```
sahakarmitra/
├── README.md                       ← you are here
├── backend/
│   ├── .env.example                ← copy to .env, add GROQ_API_KEY
│   ├── package.json
│   ├── server.js                   ← Express entry point
│   ├── data/                       ← .txt legal documents (replace with real)
│   │   ├── elections.txt
│   │   ├── member_rights.txt
│   │   ├── dispute_resolution.txt
│   │   ├── society_registration.txt
│   │   ├── auditing.txt
│   │   └── winding_up.txt
│   ├── scripts/
│   │   └── ingest.js               ← chunk + embed + load into ChromaDB
│   ├── routes/
│   │   └── chat.js                 ← POST /api/chat
│   └── services/
│       ├── embeddings.js           ← all-MiniLM-L6-v2 wrapper (Xenova)
│       ├── retrieval.js            ← ChromaDB vector search
│       └── llm.js                  ← Groq API wrapper + grounding prompt
└── frontend/
    ├── package.json
    ├── vite.config.js              ← proxies /api → backend
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx                 ← top-level state + layout
        ├── index.css               ← Tailwind directives
        └── components/
            ├── ChatWindow.jsx      ← message list + input bar
            ├── MessageBubble.jsx   ← one message (user or bot)
            ├── LanguageSelector.jsx
            ├── CitationCard.jsx     ← collapsible source card
            └── ExampleChips.jsx     ← clickable starter questions
```

---

## How the grounding actually works

The single most important line in the whole project is the system prompt
in `backend/services/llm.js`:

> "Answer the user's question using ONLY the legal text provided below.
>  Always cite the section/source you used. If the retrieved text does not
>  contain the answer, say clearly that you don't have information on this
>  topic — do not guess."

Combined with `temperature: 0.2` (low) and the explicit `[Source N]`
tags wrapped around each retrieved chunk, this is what makes the bot
*grounded* rather than a generic AI. The frontend then re-surfaces the
exact chunks the LLM saw as collapsible citation cards, so a user (or
a judge) can verify the answer against the source in one click.

---

## Replacing the placeholder legal text

The 6 `.txt` files in `backend/data/` are **illustrative paraphrases**,
not the real Maharashtra Cooperative Societies Act, 1960. To use real
legal text:

1. Replace the contents of the `.txt` files (or add new ones) with the
   real Act text. The chunker only cares that paragraphs are separated
   by blank lines.
2. Re-run `npm run ingest` — the script wipes the old collection first,
   so re-running is safe and idempotent.
3. That's it. No code changes needed.

---

## Troubleshooting

| Symptom                                                | Fix                                                                 |
|--------------------------------------------------------|---------------------------------------------------------------------|
| `Ingestion failed: ... ECONNREFUSED`                   | ChromaDB server isn't running. Start it with `chroma run --path ./chroma_data --port 8000`. |
| `GROQ_API_KEY is not set`                              | You forgot to copy `.env.example` → `.env` and add your key.        |
| `Groq API error 401`                                   | The key in `.env` is wrong or revoked.                              |
| Frontend loads but every chat returns "could not find any relevant legal text" | Re-run `npm run ingest`. The collection is empty. |
| Embeddings step is slow on first run                   | First call downloads the ~90 MB `all-MiniLM-L6-v2` model. Subsequent runs use the cache. |
| Devanagari (हिंदी / मराठी) text shows as boxes         | Your browser's default font lacks Devanagari glyphs. The CSS lists `Noto Sans Devanagari` as a fallback; install it or use any modern browser. |

---

## Constraints honoured

- ✅ **Zero paid services** — ChromaDB local, MiniLM-L6-v2 local, Groq free tier.
- ✅ **Clean, commented code** — every file has a header comment block.
- ✅ **No auth / no DB persistence** beyond ChromaDB.
- ✅ **Hackathon prototype** — works end-to-end, not optimised for scale.

---

## Roadmap (after the hackathon)

- Swap the placeholder text for the actual Maharashtra Cooperative
  Societies Act, 1960 (PDF → text pipeline).
- Add more Indian state Acts (Gujarat, Karnataka, etc.).
- Add a "did this help?" feedback button to log bad answers.
- Stream the LLM response token-by-token for a snappier UX.
- Persist per-session history in ChromaDB or localStorage.
