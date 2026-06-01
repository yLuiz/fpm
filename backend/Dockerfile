FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat wget

WORKDIR /app

# Create logs directory
RUN mkdir -p /app/logs

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

# Run migrations, seed, and start
CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && npm run start:prod"]
