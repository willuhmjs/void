# Use a Node.js base image
FROM node:18-alpine

ENV NODE_ENV=production

EXPOSE 3000

USER node

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci && npm cache clean --force

COPY --chown=node:node . .

COPY --chown=node:node entrypoint.sh /
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "build/index.js"]
