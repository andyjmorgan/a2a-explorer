FROM python:3.12-slim

ARG AGENTLINGS_REF=main

RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir "agentlings @ git+https://github.com/andyjmorgan/DonkeyWork-Agentlings@${AGENTLINGS_REF}"

WORKDIR /app
COPY agent.yaml /app/agent.yaml

VOLUME /data
ENV AGENT_DATA_DIR=/data \
    AGENT_CONFIG=/app/agent.yaml \
    AGENT_HOST=0.0.0.0 \
    AGENT_PORT=8420 \
    AGENT_MODEL=gemma3:4b

EXPOSE 8420

ENTRYPOINT ["agentling"]
