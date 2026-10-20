FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY service.mjs server.mjs render.mjs public-shell.json ./
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
