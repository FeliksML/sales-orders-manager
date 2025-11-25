# Multi-stage build for production-ready frontend

# Stage 1: Build the React application
FROM node:20-alpine as build

WORKDIR /app

# Copy shared package first (from parent directory context)
COPY shared /shared

# Install shared package dependencies
WORKDIR /shared
RUN npm install

# Switch back to app directory
WORKDIR /app

# Copy package files and update shared reference
COPY frontend/package*.json ./

# Update package.json to point to copied shared folder
RUN sed -i 's|"file:../shared"|"file:/shared"|g' package.json

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ .

# Build the application
RUN npm run build

# Stage 2: Production image with Nginx
FROM nginx:alpine as production

# Copy custom nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Stage 3: Development image (optional)
FROM node:20-alpine as development

WORKDIR /app

# For development, shared is mounted via volumes
# Copy package files
COPY frontend/package*.json ./

# Install all dependencies (including dev)
RUN npm install || true

# Copy source code
COPY frontend/ .

# Expose Vite dev server port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
