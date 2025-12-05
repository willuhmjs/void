#!/bin/sh

#setup database
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
npx prisma generate --schema=/app/prisma/schema.prisma

#run custom server
npm run build
node build/index.js