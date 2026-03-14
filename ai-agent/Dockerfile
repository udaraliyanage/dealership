FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

EXPOSE 8080

CMD ["node", "src/server.js"]
