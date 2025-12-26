#!/bin/bash

set -e

echo "🚀 Setting up Pop Culture News App..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before proceeding!"
    echo ""
    exit 1
fi

echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

echo "🗄️  Running database migrations..."
npx prisma migrate deploy
echo "✅ Database migrations complete"
echo ""

echo "🔧 Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"
echo ""

echo "🌱 Initializing database with default data..."
node scripts/init-db.js
echo ""

echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Start development server: npm run dev"
echo "2. Start cron jobs (in another terminal): node scripts/cron-jobs.js"
echo "3. Visit http://localhost:3000"
echo ""
echo "For production deployment, see README.md"
