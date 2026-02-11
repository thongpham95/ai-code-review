#!/bin/bash
# Script to check and start Ollama service
# Used by the AI Code Review app to auto-start local AI

MODEL="${1:-codellama}"

echo "🔍 Checking Ollama status..."

# Check if ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Please install from https://ollama.ai"
    exit 1
fi

# Check if ollama is already running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is already running."
else
    echo "🚀 Starting Ollama..."
    ollama serve &
    sleep 3
    
    # Verify it started
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama started successfully."
    else
        echo "❌ Failed to start Ollama."
        exit 1
    fi
fi

# Check if the model is available
echo "🔍 Checking model: $MODEL..."
if ollama list | grep -q "$MODEL"; then
    echo "✅ Model $MODEL is available."
else
    echo "📥 Pulling model $MODEL..."
    ollama pull "$MODEL"
fi

echo "🎉 Ollama is ready with model: $MODEL"
