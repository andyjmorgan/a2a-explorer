<p align="center">
  <img src="public/donkeywork.png" alt="A2A Explorer" width="80" />
</p>

<h1 align="center">A2A Explorer</h1>

<p align="center">
  A web-based test client for the <a href="https://a2a-protocol.org">A2A (Agent-to-Agent) protocol</a> (v0.3.0).<br/>
  Discover agent cards, detect authentication, and chat with any A2A agent.
</p>

<p align="center">
  <a href="https://a2a-explorer.donkeywork.dev">Try the live playground</a>
</p>

---

## Features

- Agent card discovery via `/.well-known/agent.json`
- Auth detection from card `securitySchemes` (no-auth and header-based API key)
- Blocking and streaming (SSE) message support
- Multi-turn conversations via `contextId`
- Secured CORS proxy (HTTPS-only targets, private IP blocking, rate limiting)

## Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS 4, shadcn/ui, Lucide
- **Backend**: Hono on Node.js (serves static build + proxy)

## Development

```bash
pnpm install
cp .env.example .env  # optional: pre-fill agent URL and credentials
pnpm dev              # vite dev server with proxy middleware
```

## Production

```bash
pnpm build            # build frontend to dist/
pnpm start            # start Hono server on :3000
```

## Docker

```bash
docker build -t a2a-explorer .
docker run -p 3000:3000 a2a-explorer
```

Images are published to `ghcr.io/andyjmorgan/a2a-explorer` on every push to main.

## Proxy security

The `/a2a-proxy` endpoint is locked down for public hosting:

- HTTPS targets only
- Private/internal IPs blocked (RFC1918, loopback, link-local)
- 60 requests/min per client IP
- 30s request timeout, no redirect following
- 10MB response size cap
- Sensitive headers stripped (`Set-Cookie`, `Server`)

## Configuration

Dev-only environment variables (`.env`, baked at build time):

| Variable | Description |
|---|---|
| `VITE_DEFAULT_AGENT_URL` | Pre-filled agent base URL |
| `VITE_DEFAULT_HEADER_NAME` | Pre-filled auth header name |
| `VITE_DEFAULT_HEADER_VALUE` | Pre-filled auth header value |

Server environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server listen port |
