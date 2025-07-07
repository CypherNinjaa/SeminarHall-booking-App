@echo off
REM Amity Seminar Hall Booking - Email Confirmation Web App Setup Script

echo 🚀 Setting up Amity Email Confirmation Web App...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the email-confirmation-web directory
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Create .env.local from example
if not exist ".env.local" (
    echo 🔧 Creating .env.local file...
    copy .env.example .env.local
    echo ✅ .env.local created. Please update it with your actual values.
) else (
    echo ⚠️  .env.local already exists. Skipping...
)

REM Type check
echo 🔍 Running type check...
call npm run type-check

REM Build test
echo 🏗️  Testing build...
call npm run build

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Update .env.local with your Supabase credentials
echo 2. Update app store URLs in .env.local
echo 3. Run 'npm run dev' to start development server
echo 4. Deploy to Vercel when ready
echo.
echo 🌐 Local development: http://localhost:3000
echo 📧 Test verification: http://localhost:3000/verify?token=test^&email=test@example.com
echo.
echo Happy coding! 🎉
