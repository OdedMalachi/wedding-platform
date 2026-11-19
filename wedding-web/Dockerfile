FROM node:22-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json ./
COPY wedding-api/package.json ./wedding-api/
COPY wedding-web/package.json ./wedding-web/

RUN npm ci --workspace=wedding-web --include-workspace-root

COPY wedding-web ./wedding-web

RUN npm --prefix wedding-web run build

FROM node:22-alpine AS runner

WORKDIR /app/wedding-web
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/wedding-web/.next ./.next
COPY --from=builder /app/wedding-web/package.json ./package.json
COPY --from=builder /app/wedding-web/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start"]
