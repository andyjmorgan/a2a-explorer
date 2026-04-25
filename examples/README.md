# Example Agentlings

Two reference [Agentlings](https://github.com/andyjmorgan/DonkeyWork-Agentlings)
agents wired up for deployment to the **attic** k3s cluster. Both run on
`gemma3:4b` via the Ollama instance at `https://ollama.donkeywork.dev`.

## Agents

### decliner

Refuses everything with maximum corporate-speak; hostility scales with
request volume; profanity unlocks at message six. Funny demo, not
production. See [`decliner/agent.yaml`](./decliner/agent.yaml).

### polyglot-translator

Straightforward translator. Takes whatever the user says and emits
labeled translations in German, Dutch, French, and Italian — no preamble,
no commentary. See
[`polyglot-translator/agent.yaml`](./polyglot-translator/agent.yaml).

## Images

Built and pushed by
[`.github/workflows/examples-build-and-push.yml`](../.github/workflows/examples-build-and-push.yml)
on every push to `main` that touches `examples/**`. Both publish to
`ghcr.io` under the repo owner's namespace, mirroring the main
a2a-explorer publish workflow.

| Agent | Image | Tags |
| --- | --- | --- |
| decliner | `ghcr.io/andyjmorgan/decliner-agentling` | `latest` (main only), `<short-sha>`, branch ref, PR ref, semver |
| polyglot-translator | `ghcr.io/andyjmorgan/polyglot-translator-agentling` | `latest` (main only), `<short-sha>`, branch ref, PR ref, semver |

Login uses `secrets.GITHUB_TOKEN` with `packages: write`. Build is
multi-arch (`linux/amd64,linux/arm64`).

## Public DNS

Each agent gets a hostname under `agents.donkeywork.dev`:

| Agent | Public hostname |
| --- | --- |
| decliner | `decliner.agents.donkeywork.dev` |
| polyglot-translator | `polyglot-translator.agents.donkeywork.dev` |

Both served via the existing cloudflared tunnel that already fronts
attic (the same one currently terminating `k3s-agent.donkeywork.dev`).

## Agentling framework wiring

A few notes carried over from the
[Agentlings README](https://github.com/andyjmorgan/DonkeyWork-Agentlings#environment-variables):

- The agent's identity (name, description, skills, system prompt) lives
  in `agent.yaml`. The framework auto-generates the A2A Agent Card from
  it, served at `GET /.well-known/agent-card.json`. There is no separate
  card JSON to maintain.
- `AGENT_EXTERNAL_URL` controls the URL embedded in the agent card. Set
  it to the public hostname or the card will advertise the in-cluster
  pod address — fatal for any external A2A client.
- `gemma3:4b` is reached through Ollama's Anthropic-compatible
  `/v1/messages` endpoint. The framework env var that points at it is
  **`ANTHROPIC_BASE_URL`** (confirmed in the framework's `config.py`
  and README). Set it to `https://ollama.donkeywork.dev` and pair with
  `AGENT_MODEL=gemma3:4b`. `ANTHROPIC_API_KEY` is unused but the SDK
  defaults it to `"unset"`; Ollama ignores it.
- `sleep.enabled: false` is already set in both YAMLs because Ollama
  has no batches API. Don't flip it on.
- Default port is `8420`.

## Required env / secrets per pod

Both agents need the same shape:

| Variable | Value | Source |
| --- | --- | --- |
| `AGENT_API_KEY` | Long-lived API key for clients | Secret |
| `AGENT_EXTERNAL_URL` | `https://decliner.agents.donkeywork.dev` or `https://polyglot-translator.agents.donkeywork.dev` | Deployment env (per-agent) |
| `ANTHROPIC_BASE_URL` | `https://ollama.donkeywork.dev` | Deployment env |
| `AGENT_MODEL` | `gemma3:4b` | Already baked in via the Dockerfile, override if needed |
| `AGENT_LLM_BACKEND` | `anthropic` (default — talks to Anthropic-compatible endpoint, not the real Anthropic API) | Default, no override |

`AGENT_API_KEY` should be a Kubernetes secret. Suggested layout:

```bash
kubectl -n a2a-explorer create secret generic decliner-secrets \
  --from-literal=AGENT_API_KEY="$(openssl rand -hex 32)"

kubectl -n a2a-explorer create secret generic polyglot-translator-secrets \
  --from-literal=AGENT_API_KEY="$(openssl rand -hex 32)"
```

## Cluster manifests

Apply both into the `a2a-explorer` namespace on attic.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: decliner
  namespace: a2a-explorer
  labels: { app: decliner }
spec:
  replicas: 1
  selector: { matchLabels: { app: decliner } }
  template:
    metadata: { labels: { app: decliner } }
    spec:
      containers:
        - name: decliner
          image: ghcr.io/andyjmorgan/decliner-agentling:latest
          ports: [{ containerPort: 8420, name: http }]
          env:
            - name: AGENT_EXTERNAL_URL
              value: https://decliner.agents.donkeywork.dev
            - name: ANTHROPIC_BASE_URL
              value: https://ollama.donkeywork.dev
            - name: AGENT_API_KEY
              valueFrom:
                secretKeyRef:
                  name: decliner-secrets
                  key: AGENT_API_KEY
          readinessProbe:
            httpGet: { path: /.well-known/agent-card.json, port: 8420 }
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /.well-known/agent-card.json, port: 8420 }
            initialDelaySeconds: 30
            periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: decliner
  namespace: a2a-explorer
spec:
  selector: { app: decliner }
  ports:
    - port: 80
      targetPort: 8420
      name: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: polyglot-translator
  namespace: a2a-explorer
  labels: { app: polyglot-translator }
spec:
  replicas: 1
  selector: { matchLabels: { app: polyglot-translator } }
  template:
    metadata: { labels: { app: polyglot-translator } }
    spec:
      containers:
        - name: polyglot-translator
          image: ghcr.io/andyjmorgan/polyglot-translator-agentling:latest
          ports: [{ containerPort: 8420, name: http }]
          env:
            - name: AGENT_EXTERNAL_URL
              value: https://polyglot-translator.agents.donkeywork.dev
            - name: ANTHROPIC_BASE_URL
              value: https://ollama.donkeywork.dev
            - name: AGENT_API_KEY
              valueFrom:
                secretKeyRef:
                  name: polyglot-translator-secrets
                  key: AGENT_API_KEY
          readinessProbe:
            httpGet: { path: /.well-known/agent-card.json, port: 8420 }
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /.well-known/agent-card.json, port: 8420 }
            initialDelaySeconds: 30
            periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: polyglot-translator
  namespace: a2a-explorer
spec:
  selector: { app: polyglot-translator }
  ports:
    - port: 80
      targetPort: 8420
      name: http
```

## Handoff checklist for the cluster agentling

DO NOT run any of this from this repo. The cluster work is owned by the
`mcp__donkeywork__a2a_k3s_agentling` tool. This list is what the
operator (or that tool) needs to apply once the images are pushed:

- [ ] Confirm the Examples workflow has run on `main` and both images
      tagged `latest` are available at `ghcr.io/andyjmorgan/decliner-agentling`
      and `ghcr.io/andyjmorgan/polyglot-translator-agentling`.
- [ ] Both ghcr packages need to be set to public (or the cluster needs
      a pull secret) — check
      `https://github.com/users/andyjmorgan/packages/container/decliner-agentling/settings`
      and the polyglot equivalent after the first push.
- [ ] Ensure namespace `a2a-explorer` exists on attic
      (`kubectl create namespace a2a-explorer` if not).
- [ ] Confirm `gemma3:4b` is pulled and reachable on
      `https://ollama.donkeywork.dev`.
- [ ] Generate and apply the two `*-secrets` Kubernetes secrets.
- [ ] Apply the Deployment + Service manifests above into the
      `a2a-explorer` namespace.
- [ ] Wait for both pods to be ready and verify
      `kubectl -n a2a-explorer port-forward svc/decliner 8080:80` then
      `curl localhost:8080/.well-known/agent-card.json` returns the
      Decliner card; same check for `polyglot-translator`.
- [ ] **Cloudflare DNS:** create CNAME records for
      `decliner.agents.donkeywork.dev` and
      `polyglot-translator.agents.donkeywork.dev`, both pointing at the
      attic cloudflared tunnel (same target the existing
      `k3s-agent.donkeywork.dev` record uses).
- [ ] **Cloudflared tunnel ingress:** add two entries to the attic
      tunnel's `config.yaml`, mirroring the existing
      `k3s-agent.donkeywork.dev` rule:

      ```yaml
      ingress:
        - hostname: decliner.agents.donkeywork.dev
          service: http://decliner.a2a-explorer.svc.cluster.local
        - hostname: polyglot-translator.agents.donkeywork.dev
          service: http://polyglot-translator.a2a-explorer.svc.cluster.local
        # ... existing rules below, including the catch-all 404 last
      ```

- [ ] Reload / restart the cloudflared deployment so the new ingress
      rules take effect.
- [ ] Smoke-test from the public internet:
      `curl https://decliner.agents.donkeywork.dev/.well-known/agent-card.json`
      and the polyglot equivalent. Confirm the `url` field in each card
      matches its public hostname (i.e. `AGENT_EXTERNAL_URL` plumbing
      worked).
- [ ] Add both agents to the a2a-explorer's known-agent list (if that's
      how the explorer ingests new agentlings).

## TODOs / open questions for the human

- The agent images pin the agentlings framework via `AGENTLINGS_REF`
  (default `main`). Bump to a tagged release once the framework cuts one.
- Cloudflared tunnel config on attic — confirm the tunnel name and
  config path before the cluster agentling appends ingress rules.
- ghcr packages default to private when first published. Either flip
  them to public after the first build or hand the cluster a pull
  secret.
