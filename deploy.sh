#!/bin/bash

# Vercel Deployment Script for Google Cloud Translation App
# This script helps you deploy your app to Vercel with Google Cloud credentials

echo "🚀 Vercel Deployment Helper"
echo "============================"
echo ""

# Check if service account key file exists
if [ ! -f "service-account-key.json" ]; then
    echo "❌ Error: service-account-key.json not found"
    echo "Please place your Google Cloud service account key file in the root directory"
    exit 1
fi

echo "✅ Found service-account-key.json"
echo ""

# Convert to base64
echo "📦 Converting credentials to base64..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    BASE64_CREDS=$(base64 -i service-account-key.json)
else
    # Linux
    BASE64_CREDS=$(base64 -w 0 service-account-key.json)
fi

echo "✅ Credentials encoded"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📋 Setting up environment variable..."
echo ""
echo "You have two options:"
echo ""
echo "Option 1: Set via Vercel CLI (recommended for first time)"
echo "Option 2: Set via Vercel Dashboard"
echo ""

read -p "Choose option (1 or 2): " choice

if [ "$choice" == "1" ]; then
    echo ""
    echo "Setting GOOGLE_CREDENTIALS_BASE64 via Vercel CLI..."
    echo "$BASE64_CREDS" | vercel env add GOOGLE_CREDENTIALS_BASE64 production
    echo "$BASE64_CREDS" | vercel env add GOOGLE_CREDENTIALS_BASE64 preview
    echo "$BASE64_CREDS" | vercel env add GOOGLE_CREDENTIALS_BASE64 development
    echo ""
    echo "✅ Environment variables set!"
elif [ "$choice" == "2" ]; then
    echo ""
    echo "📋 Here's your base64-encoded credentials:"
    echo "Copy this value and add it manually in Vercel Dashboard"
    echo "Variable name: GOOGLE_CREDENTIALS_BASE64"
    echo ""
    echo "----------------------------------------"
    echo "$BASE64_CREDS"
    echo "----------------------------------------"
    echo ""
    read -p "Press Enter after you've added it to Vercel Dashboard..."
fi

echo ""
echo "🚀 Ready to deploy!"
echo ""
read -p "Deploy now? (y/n): " deploy

if [ "$deploy" == "y" ]; then
    echo ""
    echo "Deploying to Vercel..."
    vercel --prod
    echo ""
    echo "✅ Deployment complete!"
else
    echo ""
    echo "To deploy later, run: vercel --prod"
fi

echo ""
echo "🎉 Setup complete!"