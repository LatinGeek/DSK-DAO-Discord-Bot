#!/bin/bash

# Deploy DSKDAO Discord Bot to Google Cloud Run
# This script securely handles Firebase credentials

echo "🚀 Starting deployment to Google Cloud Run..."

# Build and submit Docker image
echo "📦 Building Docker image..."
gcloud builds submit --tag gcr.io/dskdao-discord/discord-bot

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker build successful!"

# Deploy to Cloud Run with environment variables
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy discord-bot \
    --image gcr.io/dskdao-discord/discord-bot \
    --platform managed \
    --region us-central1 \
    --set-env-vars "ENABLE_RAFFLES=true" \
    --set-env-vars "FIREBASE_PROJECT_ID=dskdao-discord" \
    --set-env-vars "FIREBASE_CLIENT_EMAIL=firebase-adminsdk-exc4r@dskdao-discord.iam.gserviceaccount.com" \
    --update-secrets "DISCORD_TOKEN=discord-bot-token:latest" \
    --update-secrets "FIREBASE_PRIVATE_KEY=firebase-private-key:latest" \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --timeout 3600

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🎫 Raffle system is DISABLED by default"
    echo "💡 To enable raffles: gcloud run services update discord-bot --region=us-central1 --set-env-vars ENABLE_RAFFLES=true"
else
    echo "❌ Deployment failed!"
    exit 1
fi 