FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV OPENCODE_VERSION="2.3.0"
ENV PATH="/root/.opencode/bin:${PATH}"

RUN curl -fsSL https://opencode.ai/v2/install -o /tmp/opencode-install \
 && bash /tmp/opencode-install --version "${OPENCODE_VERSION}" --no-modify-path \
 && rm /tmp/opencode-install \
 && opencode --version

RUN mkdir -p /root/.config/opencode/agents /tmp/crew
COPY opencode.jsonc /root/.config/opencode/opencode.jsonc
COPY .opencode/agents/ /root/.config/opencode/agents/

WORKDIR /app
COPY opencode.jsonc ./opencode.jsonc
COPY .opencode/agents/ ./.opencode/agents/
COPY server.mjs ./

ENV OPENCODE_SERVER_URL="http://127.0.0.1:28894"
EXPOSE 8787

CMD ["sh", "-c", "opencode serve --hostname 127.0.0.1 --port 28894 >/tmp/opencode.log 2>&1 & exec node server.mjs"]
