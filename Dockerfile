FROM node:22-alpine

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY wedding-api/package.json ./wedding-api/
COPY wedding-web/package.json ./wedding-web/

# Install all workspace dependencies
RUN npm install

# Copy application source
COPY wedding-api ./wedding-api
COPY wedding-web ./wedding-web
COPY scripts ./scripts

# Build Next.js frontend (with integrated /api/[...path] backend route)
RUN npm run build:web

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "scripts/start-prod.mjs"]
