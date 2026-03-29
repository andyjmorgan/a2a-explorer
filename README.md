# A2A Explorer

A test client for the [A2A (Agent-to-Agent) protocol](https://a2a-protocol.org). Discovers agent cards, handles authentication, and provides a chat interface for interacting with A2A agents.

Supports both the v0.3.0 and v1.0 agent card formats.

## Features

- Agent card discovery via `/.well-known/agent.json`
- Auth detection from card `securitySchemes` (no-auth and header-based auth)
- Blocking and streaming (SSE) message support
- Multi-turn conversations via `contextId` / `taskId`
- Built-in CORS proxy for dev (Vite middleware)

## Stack

React 19, Vite 8, Tailwind CSS 4, shadcn/ui, Lucide

## Getting started

```bash
pnpm install
cp .env.example .env  # edit with your agent URL and credentials
pnpm dev
```

## Configuration

Environment variables (`.env`):

| Variable | Description |
|---|---|
| `VITE_DEFAULT_AGENT_URL` | Pre-filled agent base URL |
| `VITE_DEFAULT_HEADER_NAME` | Pre-filled auth header name |
| `VITE_DEFAULT_HEADER_VALUE` | Pre-filled auth header value |
