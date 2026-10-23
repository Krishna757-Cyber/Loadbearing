# Multi-stage production Dockerfile for LoadBearing on AWS (App Runner / ECS / EC2)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root manifests and workspace package manifests for caching
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/router/package.json ./packages/router/
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY apps/web/package.json ./apps/web/

# Install all dependencies (including devDependencies required for build)
RUN npm ci

# Copy entire source tree
COPY . .

# Build packages and applications
ENV NODE_ENV=production
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV MCP_PORT=8787
ENV MCP_SERVER_URL=http://localhost:8787

# Copy built application and dependencies
COPY --from=builder /app /app

# Expose Next.js Web (3000) and MCP Server (8787)
EXPOSE 3000
EXPOSE 8787

# Health check against the web UI
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start both MCP server and Next.js web application
CMD ["npm", "start"]
