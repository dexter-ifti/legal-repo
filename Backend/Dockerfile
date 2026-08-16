FROM node:24-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy application source code
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma Client and build TypeScript source
RUN npx prisma generate
RUN npm run build

# Expose backend API port
EXPOSE 5000

# Run database push and start backend server
CMD ["sh", "-c", "npx prisma db push && npm start"]
