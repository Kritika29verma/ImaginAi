# ImaginAi — Project Architecture

Live URL: https://imagin-ai-dun.vercel.app

---

## What This Project Does

ImaginAi is a full-stack AI-powered web application with two core features:

1. **Text → Image**: User types a short idea → AI expands it into a rich prompt → AI generates an image from it
2. **Image → Variation**: User uploads an image → AI analyzes it and describes it → AI generates an artistic variation

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript | UI, user interaction |
| Backend | Node.js + Express.js v5 | REST API server |
| AI (Text) | Google Gemini `gemini-2.5-flash` | Prompt enhancement, image analysis |
| AI (Image) | Google Gemini `gemini-2.5-flash-image` | Image generation |
| SDK | `@google/generative-ai` v0.24 | Gemini API client |
| Deployment | Vercel (Serverless Functions) | Hosting, auto-deploy from GitHub |
| Env Config | dotenv | Manage API keys locally |
| Middleware | cors, express.json, express.static | Security, parsing, static serving |

---

## Project Folder Structure

```
ImageGeneration/
│
├── api/
│   └── index.js          ← The entire backend (Express server)
│                           Also acts as Vercel Serverless Function
│
├── backend/
│   └── .env              ← Secret keys (never pushed to GitHub)
│                           GEMINI_API_KEY, FRONT_END_PORT
│
├── frontend/
│   ├── index.html        ← Single page UI (all sections on one page)
│   ├── app.js            ← All frontend logic (fetch calls, DOM updates)
│   └── styles.css        ← All styling (responsive, custom classes)
│
├── package.json          ← Node dependencies (backend)
├── package-lock.json     ← Locked dependency versions
├── vercel.json           ← Vercel deployment config (routing + timeout)
└── .gitignore            ← Hides node_modules and .env from GitHub
```

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USER BROWSER                     │
│                                                     │
│   frontend/index.html  ←  UI structure (HTML)       │
│   frontend/styles.css  ←  Styling                   │
│   frontend/app.js      ←  Logic + fetch() API calls │
└────────────────────┬────────────────────────────────┘
                     │  HTTP requests (GET/POST)
                     │  Same origin (no CORS on Vercel)
                     ▼
┌─────────────────────────────────────────────────────┐
│             VERCEL SERVERLESS FUNCTION              │
│                  api/index.js                       │
│                                                     │
│   Express.js handles:                               │
│   - Serving frontend static files                   │
│   - REST API routes (/api/*)                        │
│   - CORS, JSON parsing middleware                   │
└────────────────────┬────────────────────────────────┘
                     │  HTTPS API calls
                     ▼
┌─────────────────────────────────────────────────────┐
│              GOOGLE GEMINI API                      │
│                                                     │
│   gemini-2.5-flash       → Text generation          │
│                            (prompt enhance/analyze) │
│   gemini-2.5-flash-image → Image generation         │
└─────────────────────────────────────────────────────┘
```

---

## API Endpoints (Backend)

### `GET /api/test-key`
- Checks if `GEMINI_API_KEY` is set in environment
- Used on page load to show "Ready" or "API key not configured" status
- Returns: `{ geminiKeySet: true/false }`

### `POST /api/enhance-and-analyze`
Dual-purpose endpoint — handles two modes via `type` field in body:

**Mode 1 — Enhance** (`type: "enhance"`)
- Input: `{ type, textPrompt }`
- Sends the user's short text to Gemini with a system instruction to expand it into a detailed, descriptive image generation prompt
- Returns: `{ result: "expanded detailed prompt..." }`

**Mode 2 — Analyze** (`type: "analyze"`)
- Input: `{ type, base64Image, mimeType }`
- Sends the image as inline base64 data to Gemini Vision
- Gemini describes subject, style, color, mood and returns a prompt that could recreate the image
- Returns: `{ result: "generated prompt from image..." }`

### `POST /api/generate-image`
- Input: `{ approvedPrompt }`
- Calls Gemini image generation model with the approved prompt
- Extracts `inlineData` (base64 image) from response candidates
- Returns: `{ image: "<base64 string>", finalPrompt, status }`

### `POST /api/generate-variation`
- Input: `{ imageAnalysis }` (the text from the analyze step)
- Prepends a style instruction: *"cinematic digital painting with neon lighting and deep shadow"*
- Calls Gemini image model and returns the variation as base64
- Returns: `{ image: "<base64 string>", finalPrompt, status }`

---

## Feature Flows (Step by Step)

### Flow 1: Text to Image

```
User types short prompt  (e.g. "a cat in space")
        ↓
Click "Enhance Prompt"
        ↓
POST /api/enhance-and-analyze  { type: "enhance", textPrompt }
        ↓
Gemini (gemini-2.5-flash) returns detailed 100-word prompt
        ↓
Enhanced prompt shown in green box
        ↓
User clicks "Approve"  →  prompt locked in, Generate button enabled
  OR
User clicks "Edit"     →  textarea appears below
        ↓ (if Edit chosen)
User types extra instructions in textarea
Click "Add"
        ↓
POST /api/enhance-and-analyze again with combined prompt
(currentEnhancedPrompt + "Additional instructions: " + userInput)
        ↓
New enhanced prompt replaces old one
User can Approve or Edit again
        ↓
Click "Generate Image"
        ↓
POST /api/generate-image  { approvedPrompt }
        ↓
Gemini (gemini-2.5-flash-image) returns base64 PNG
        ↓
Image shown in browser via Data URI:  data:image/png;base64,...
        ↓
User can Download  (creates <a> tag with href = data URI, clicks it)
```

### Flow 2: Image Variation

```
User uploads an image file
        ↓
FileReader API reads file → converts to base64
Image preview shown immediately (Data URI)
        ↓
Click "Analyze Image"
        ↓
POST /api/enhance-and-analyze  { type: "analyze", base64Image, mimeType }
        ↓
Gemini Vision (gemini-2.5-flash) receives image as inlineData
Returns: text description / prompt
        ↓
Analysis text shown in grey box
        ↓
Click "Generate Variation"
        ↓
POST /api/generate-variation  { imageAnalysis }
        ↓
Backend prepends cinematic style instruction to the analysis
Gemini image model generates variation
        ↓
Variation shown as base64 image + download option
```

---

## Key Concepts & Patterns Used

### 1. Serverless Architecture
- `api/index.js` is an Express app **exported as a module** (`module.exports = app`)
- On Vercel, it runs as a **serverless function** — no persistent server, spins up per request
- `app.listen()` is wrapped in `if (NODE_ENV !== 'production')` so it only runs locally

### 2. Singleton + Lazy Initialization Pattern
```js
let genAIInstance = null;

function getGenAI() {
    if (!genAIInstance) {
        genAIInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAIInstance;
}
```
- AI client objects are created **only once** per serverless execution context (cold start)
- Avoids re-initializing on every request = better performance
- Three singletons: `genAIInstance`, `geminiModelInstance`, `t2iModelInstance`

### 3. Multimodal AI
- Same `gemini-2.5-flash` model handles **text-only** and **text+image** inputs
- For image analysis, image is passed as `inlineData: { data: base64, mimeType }` alongside text instruction
- This is called **multimodal** — one model that understands multiple types of input

### 4. Base64 Image Transfer
- Images are never stored on a server or disk
- Browser reads file → `FileReader.readAsDataURL()` → base64 string
- Base64 sent to backend in JSON body → forwarded to Gemini
- Gemini returns generated image as base64 → sent back in JSON
- Frontend displays using `<img src="data:image/png;base64,...">` (Data URI)

### 5. REST API Design
- API is split into focused endpoints by responsibility
- Single endpoint (`/api/enhance-and-analyze`) handles two related operations via a `type` discriminator field — reduces code duplication
- Proper HTTP status codes: `200` (OK), `400` (bad request), `500` (server error)

### 6. CORS (Cross-Origin Resource Sharing)
- Configured with specific origin from env var (`FRONT_END_PORT`)
- Allows `GET`, `POST`, `OPTIONS` methods
- `OPTIONS` preflight requests are handled automatically
- On Vercel (same origin), CORS headers are irrelevant but kept for local dev

### 7. Environment Variable Management
- API keys stored in `backend/.env` — loaded via `dotenv`
- `.env` is in `.gitignore` so secrets are never pushed to GitHub
- On Vercel, env vars are set manually in the dashboard → available as `process.env.*`
- Path resolved explicitly: `path.join(__dirname, '..', 'backend', '.env')`

### 8. Express Static File Serving
- `express.static(path.join(__dirname, '..', 'frontend'))` serves all files in `frontend/`
- When browser requests `/`, Express serves `frontend/index.html` automatically
- When browser requests `/app.js`, serves `frontend/app.js`, etc.

### 9. Vercel Routing (vercel.json)
```json
{ "source": "/(.*)", "destination": "/api/index.js" }
```
- All incoming requests (static + API) are routed through Express
- Express's own router decides: serve file or handle API call
- `maxDuration: 60` — extends serverless function timeout to 60s (Gemini can be slow)

### 10. Dynamic API Base URL (Environment Detection)
```js
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : '';
```
- On localhost: hits `http://localhost:3001/api/...` (local Express server)
- On Vercel: empty string → relative URL `/api/...` (same origin)
- No code change needed when switching between environments

### 11. Gemini Safety Settings
```js
{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: BLOCK_NONE }
```
- All four harm categories set to `BLOCK_NONE` for creative freedom
- Without this, Gemini might block artistic/dark-themed image prompts

### 12. Prompt Engineering
- System instructions embedded directly in API calls as text parts
- For enhancement: role-based instruction ("You are a world-class creative director...")
- For variation: style prefix appended to prompt ("cinematic digital painting with neon lighting...")
- Controls output quality and format from the AI

### 13. FileReader API (Browser)
- Native browser API — no library needed
- `reader.readAsDataURL(file)` converts image file to base64
- Used to preview the image locally AND send it to backend for analysis

### 14. Async/Await + Error Handling
- All API calls use `async/await` for clean asynchronous code
- `try/catch/finally` pattern in every async function
- `finally` block always hides the loading overlay — even on errors
- Prevents UI from getting stuck in "loading" state

---

## Data Flow Diagram

```
BROWSER                        EXPRESS (api/index.js)        GEMINI API
  │                                     │                        │
  │── POST /api/enhance-and-analyze ───►│                        │
  │   { type:"enhance", textPrompt }    │── generateContent() ──►│
  │                                     │   [instruction, prompt] │
  │                                     │◄── { response } ───────│
  │◄── { result: "enhanced prompt" } ───│                        │
  │                                     │                        │
  │── POST /api/generate-image ────────►│                        │
  │   { approvedPrompt }                │── generateContent() ──►│
  │                                     │   [prompt]             │
  │                                     │◄── { candidates[0]     │
  │                                     │     .content.parts     │
  │                                     │     [inlineData] }     │
  │◄── { image: "base64..." } ──────────│                        │
  │                                     │                        │
  │  Display: <img src="data:image/     │                        │
  │            png;base64,...">         │                        │
```

---

## Deployment (Vercel)

- **Auto-deploy**: Every `git push` to `main` triggers a new Vercel deployment
- **Serverless**: No server to maintain — Vercel runs the function on demand
- **Environment Variables**: Set once in Vercel dashboard, persist across all deployments
- **CDN**: Static assets served from Vercel's global CDN edge network
- **Free Tier**: Hobby plan with 60s max function duration, 100GB bandwidth/month

---

## What I Would Add Next (Improvements)

- **Image history** — save generated images with MongoDB (mongoose is already installed)
- **Loading skeleton** — better UX while images load
- **Prompt templates** — pre-built styles (watercolor, anime, realistic, etc.)
- **User auth** — login to save personal image history
- **Rate limiting** — prevent API key from being exhausted
