# JEREN EDUCATION — Aria AI Worker

Cloudflare Worker proxy for the Aria AI assistant.

## Security

- API key is stored **only** as a Cloudflare secret: `GEMINI_API_KEY`
- Never commit API keys to git
- Never expose keys in frontend HTML/JS/CSS

## Setup

```bash
cd workers/aria-ai
npm install -g wrangler   # if not installed
wrangler login
wrangler secret put GEMINI_API_KEY
wrangler deploy
```

## Endpoint

```
POST https://jeren-aria-ai.jeren-education.workers.dev/api/aria
```

## Allowed origins

- `https://kral8.github.io` (GitHub Pages)
- `http://localhost:8765`, `http://localhost:8080` (local dev)
- `http://127.0.0.1:8765`, `http://127.0.0.1:8080`

## Request

```json
{
  "message": "User question",
  "history": [{ "role": "user", "text": "..." }, { "role": "assistant", "text": "..." }]
}
```

## Response

```json
{
  "success": true,
  "answer": "AI response text"
}
```
