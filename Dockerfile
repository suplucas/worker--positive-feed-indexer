# Base image
FROM node:26-alpine AS builder

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --include=optional

COPY . .

RUN npm run build

FROM node:26-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev --include=optional

COPY --from=builder /usr/src/app/dist ./dist

CMD ["node", "dist/main.js"]
