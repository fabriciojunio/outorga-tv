# Servidor do modo "Em casa" em container: alternativa ao instalador do
# Windows para quem tem um Linux, um NAS ou um mini PC ligado o tempo todo.
#
#   docker compose --profile casa up -d
#
# Os vídeos entram por volume, só leitura. O banco do acervo fica em outro
# volume, para sobreviver à troca de imagem.

# Node 24: o node:sqlite, que guarda o acervo, vem sem flag desde o 22.13.
FROM node:24-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS construcao
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_SAIDA=standalone
RUN npx next build

FROM node:24-alpine AS execucao
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    CASA_BANCO=/dados/casa.db \
    BIBLIOTECA_DIR=/videos

# A imagem do Node já traz o usuário "node", sem privilégio. É com ele que o
# servidor roda: se alguém achar uma falha, não ganha a máquina junto.
COPY --from=construcao --chown=node:node /app/.next/standalone ./
COPY --from=construcao --chown=node:node /app/.next/static ./.next/static
RUN mkdir -p /dados && chown node:node /dados
USER node

EXPOSE 3000
VOLUME ["/dados"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q -O- http://127.0.0.1:3000/api/casa/vivo | grep -q casa || exit 1

CMD ["node", "server.js"]
