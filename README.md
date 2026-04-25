<p align="center">
  <img src="a2a-explorer.png" alt="A2A Explorer" width="200" />
</p>

<h1 align="center">A2A Explorer</h1>

<p align="center">
  A web-based test client for the <a href="https://a2a-protocol.org">A2A (Agent-to-Agent) protocol</a> (v0.3.0).<br/>
  Log in, save your A2A agents, and chat with them.
</p>

<p align="center">
  <a href="https://a2a-explorer.donkeywork.dev">Try the live playground</a>
</p>

---

## Features

- Keycloak login (confidential PKCE client against `auth.donkeywork.dev`, realm `Agents`).
- Per-user saved agents — name, base URL, optional auth header. Auth values encrypted at rest via `pgcrypto`.
- First-party REST surface at `/api/v1/agents/*` — the browser never talks to an external A2A agent directly. The backend owns the A2A JSON-RPC conversation via the official [`A2A`](https://www.nuget.org/packages/A2A) SDK.
- SSRF-validated outbound `HttpClient` (HTTPS-only, no private/link-local/loopback addresses).
- Per-user rate limit (60/min) on outbound endpoints.

## Stack

- **Frontend** — React 19, Vite 8, Tailwind CSS 4, shadcn/ui, Zustand, react-router-dom v7.
- **Backend** — .NET 10, ASP.NET Core, EF Core + PostgreSQL + pgcrypto, JWT bearer against Keycloak. Modular monolith layout (Api/Contracts/Core per feature) matching the sibling [DonkeyWork-Agents](https://github.com/andyjmorgan/DonkeyWork-Agents) project.
- **Auth** — Keycloak via backend-brokered OAuth2 PKCE. Tokens flow to the SPA in a URL fragment; backend validates JWTs and populates a scoped `IIdentityContext` consumed by services and the EF query filter.

## Dev loop

Three processes: postgres, the .NET backend, and Vite.

```bash
# 1. Start postgres with pgcrypto preloaded.
docker compose up -d postgres

# 2. Start the .NET backend (port 5050). First boot runs EF migrations.
cd backend
dotnet run --project src/DonkeyWork.A2AExplorer.Api

# 3. In another terminal, start Vite (port 5199). Proxies /api/* → :5050.
pnpm install
pnpm dev
```

Open <http://localhost:5199>. You'll land on the login page; click through Keycloak, save an agent, chat.

### Backend configuration

Copy `backend/src/DonkeyWork.A2AExplorer.Api/appsettings.json` to `appsettings.Development.json` (gitignored) and fill in secrets. Minimum shape:

```jsonc
{
  "Persistence": {
    "ConnectionString": "Host=localhost;Port=5433;Database=a2a_explorer;Username=a2a_explorer;Password=a2a_explorer_dev"
  },
  "Keycloak": {
    "Authority": "https://auth.donkeywork.dev/realms/Agents",
    "Audience": "a2a-explorer",
    "ClientId": "a2a-explorer",
    "ClientSecret": "<from Keycloak Admin>",
    "FrontendUrl": "http://localhost:5199",
    "RequireHttpsMetadata": true
  },
  "Security": {
    "CredentialEncryptionKey": "<any string, 16+ chars — used by pgcrypto>"
  }
}
```

All values are env-var overridable (`Keycloak__ClientSecret=...`, `Persistence__ConnectionString=...`, etc.).

### Keycloak client

A2A Explorer needs a confidential OIDC client in the Keycloak realm you sign into:

- Client ID: `a2a-explorer`
- Access type: confidential (client secret)
- Standard flow: on; Direct access grants / implicit / service accounts: off
- PKCE: `S256`
- Valid redirect URIs: `http://localhost:5050/api/v1/auth/callback`, `https://a2a-explorer.donkeywork.dev/api/v1/auth/callback`
- Web origins: `http://localhost:5199`, `https://a2a-explorer.donkeywork.dev`

## Tests

Backend unit + module tests:

```bash
cd backend
dotnet test A2AExplorer.slnx --filter "FullyQualifiedName!~Integration.Tests"
```

The `*Core.Tests` that exercise pgcrypto spin up a throwaway PostgreSQL container via [Testcontainers](https://dotnet.testcontainers.org/) — Docker must be running.

Frontend:

```bash
pnpm test           # vitest, one-shot
pnpm test:coverage  # with coverage gate (90% lines / 80% branches)
```

## Docker

Single container, frontend + backend + static assets:

```bash
docker build -t a2a-explorer .
docker run -p 8080:8080 \
  -e Persistence__ConnectionString="..." \
  -e Keycloak__Authority="https://auth.donkeywork.dev/realms/Agents" \
  -e Keycloak__Audience="a2a-explorer" \
  -e Keycloak__ClientId="a2a-explorer" \
  -e Keycloak__ClientSecret="..." \
  -e Keycloak__FrontendUrl="https://a2a-explorer.donkeywork.dev" \
  -e Security__CredentialEncryptionKey="..." \
  a2a-explorer
```

The app runs on `http://+:8080`. Put a TLS terminator in front for production.

Images are published to `ghcr.io/andyjmorgan/a2a-explorer` on every push to main.
