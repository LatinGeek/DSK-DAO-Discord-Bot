FROM node:18

# Install required dependencies for better-sqlite3
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Declare volume for persistent storage
VOLUME ["/usr/src/app/data"]

# Set environment variables
ENV QUICK_DB_PATH=/usr/src/app/data/quick.db
ENV PORT=8080

# Add a simple express server to handle health checks
RUN npm install express

# Create a new file called server.js
RUN echo 'const express = require("express"); \n\
const app = express(); \n\
const port = process.env.PORT || 8080; \n\
\n\
app.get("/", (req, res) => { \n\
  res.send("Bot is running!"); \n\
}); \n\
\n\
app.listen(port, () => { \n\
  console.log(`Server listening on port ${port}`); \n\
  require("./index.js"); \n\
});' > server.js

# Start the server instead of the bot directly
CMD ["node", "server.js"]