# Use a Node.js base image
FROM node:18-alpine

EXPOSE 3000

USER node

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci && npm cache clean --force

COPY --chown=node:node . .

RUN npx prisma generate --schema=/app/prisma/schema.prisma
RUN npm run build

ENV NODE_ENV=production

COPY --chown=node:node entrypoint.sh /
ENTRYPOINT ["./entrypoint.sh"]
