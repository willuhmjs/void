# Use a Node.js base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

RUN apk add poppler-data poppler-utils

# copy database schema https://github.com/prisma/prisma/discussions/19669#discussioncomment-11884582
COPY prisma/schema.prisma ./

# Install dependencies
RUN npm ci

COPY . .

# Build the SvelteKit app
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

ENV NODE_ENV=production

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER 1000

ENTRYPOINT ["./entrypoint.sh"]

