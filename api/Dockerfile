FROM node:22-slim

# Install runtime dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libx11-xcb1 \
    libxcb1 \
    libxshmfence1 \
    libglu1-mesa \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    ca-certificates \
    curl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer env
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml .npmrc* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build the application
RUN pnpm run build

# Create data directories
RUN mkdir -p /app/data/raw /app/data/extracted /app/data/cleaned /app/data/chunks /app/data/logs

# Set Node.js heap limit (Render Starter plan has 512MB RAM)
# ts-node for seeding + TypeScript compiler can exhaust default heap
ENV NODE_OPTIONS="--max-old-space-size=350"

EXPOSE 9090

CMD sh -c "pnpm run seed:production || echo 'Seeding skipped or failed, continuing...' && exec node dist/main.js"
