FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5173

RUN addgroup -S moonbell && adduser -S moonbell -G moonbell

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN chown -R moonbell:moonbell /app

USER moonbell
EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5173/api/health | grep -q '"ok":true'

CMD ["node", "server.js"]
