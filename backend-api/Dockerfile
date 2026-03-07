FROM node:20-alpine

WORKDIR /app

# 1. Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# 2. Copy EVERYTHING else (including the data/ folder)
COPY . .

# 3. Double check permissions (optional)
RUN chmod -R 755 /app/data

EXPOSE 5001

CMD ["node", "server.js"]