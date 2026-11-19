FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY wedding-api/package.json ./wedding-api/
COPY wedding-web/package.json ./wedding-web/

RUN npm install --workspace=wedding-api --include-workspace-root

COPY wedding-api ./wedding-api

WORKDIR /app/wedding-api

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "--experimental-strip-types", "src/server.ts"]
