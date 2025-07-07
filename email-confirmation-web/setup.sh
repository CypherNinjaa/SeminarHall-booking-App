#!/bin/bash

# Amity Seminar Hall Booking - Email Confirmation Web App Setup Script

echo "🚀 Setting up Amity Email Confirmation Web App..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the email-confirmation-web directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local from example
if [ ! -f ".env.local" ]; then
    echo "🔧 Creating .env.local file..."
    cp .env.example .env.local
    echo "✅ .env.local created. Please update it with your actual values."
else
    echo "⚠️  .env.local already exists. Skipping..."
fi

# Type check
echo "🔍 Running type check..."
npm run type-check

# Build test
echo "🏗️  Testing build..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update .env.local with your Supabase credentials"
echo "2. Update app store URLs in .env.local"
echo "3. Run 'npm run dev' to start development server"
echo "4. Deploy to Vercel when ready"
echo ""
echo "🌐 Local development: http://localhost:3000"
echo "📧 Test verification: http://localhost:3000/verify?token=test&email=test@example.com"
echo ""
echo "Happy coding! 🎉"
