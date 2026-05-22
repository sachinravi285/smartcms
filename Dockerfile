# Use the official Node.js 20 lightweight Alpine image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency configuration files
COPY package*.json ./

# Install only production dependencies for a lightweight image
RUN npm ci --only=production

# Copy the rest of the application files (obeying .dockerignore)
COPY . .

# Set default port environment variable
ENV PORT=5000

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
