# ⚡ Quick Start Guide

## 5-Minute Setup

### 1. Copy Files to Server
```bash
scp -r pop_culture_news_app/ user@192.168.1.236:/home/user/
```

### 2. Configure Environment
```bash
cd pop_culture_news_app
cp .env.example .env
nano .env
```

**Minimum required changes:**
```env
# Gmail settings
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="your-email@gmail.com"

# Email recipients
DEFAULT_EMAIL_RECIPIENTS="dain.franklyn@icloud.com,jherria@hotmail.com"
```

### 3. Launch
```bash
docker-compose up -d
```

### 4. Access
Open: http://192.168.1.236:3000

### 5. First Steps
1. Go to Settings
2. Click "Fetch News Now"
3. Send test email
4. Start rating articles!

## Common Commands

```bash
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Update
git pull && docker-compose up -d --build
```

## Get Gmail App Password

1. Visit: https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Generate new password for "Mail"
5. Copy the 16-character code
6. Use in `.env` file

That's it! 🎉
