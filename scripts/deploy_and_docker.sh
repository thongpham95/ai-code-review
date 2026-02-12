#!/bin/bash

# Configuration
IMAGE_NAME="ai-code-review"
TAG="latest"

echo "🚀 Starting Deployment Process..."

# 1. Git Commit & Push
echo "📦 Staging changes..."
git add .

echo "📝 Committing changes..."
read -p "Enter commit message: " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update: Deployment $(date)"
fi
git commit -m "$COMMIT_MSG"

echo "⬆️ Pushing to remote..."
git push origin main

# 2. Docker Build (Optional)
read -p "🐳 Do you want to build and restart Docker containers? (y/n) " BUILD_DOCKER
if [[ $BUILD_DOCKER =~ ^[Yy]$ ]]; then
    echo "🏗 Building Docker image..."
    docker-compose -f docker-compose.prod.yml build
    
    echo "🔄 Restarting containers..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "✅ Docker deployment complete!"
else
    echo "⏩ Skipping Docker build."
fi

echo "🎉 Deployment script finished!"
