FROM python:3.12-slim

ARG AGENTLINGS_VERSION=0.2.3

RUN pip install --no-cache-dir "agentlings==${AGENTLINGS_VERSION}"

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
