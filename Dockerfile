FROM node:20-alpine AS builder
WORKDIR /opt/legacy
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache
WORKDIR /opt/legacy
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /opt/legacy/dist ./dist
COPY ./keys/* ./keys/
EXPOSE 4000
CMD ["npm", "run", "start"]
