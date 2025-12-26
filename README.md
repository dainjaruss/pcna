# 📰 Pop Culture News Aggregator

A self-hostable Next.js web application that aggregates pop culture news from multiple sources, with a focus on Black celebrities, artists, and athletes. Features personalized recommendations based on user ratings, credibility scoring, and automated daily email summaries.

![Next.js](https://img.shields.io/badge/Next.js-14.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)

## ✨ Features

### Core Features
- 🔄 **Automatic News Aggregation**: Fetches articles from MediaTakeOut, TMZ, The Shade Room, Baller Alert, E! News, People Magazine, Essence, and The Root
- ⭐ **Credibility Rating System**: Each source and article has a credibility rating (1-10 scale)
- 👍 **User Rating & Feedback**: Rate articles (1-5 stars) to personalize your feed
- 🎯 **Smart Recommendations**: Machine learning algorithm learns from your ratings to show more relevant content
- 📧 **Daily Email Summaries**: Automated emails with top articles based on your preferences
- 🌓 **Dark/Light Mode**: Toggle between themes with persistence
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

### Configuration Options
- ⏱️ **Refresh Frequency**: Set news fetch interval (4, 6, 8, 12, or 24 hours)
- 📮 **Email Management**: Add/remove multiple email recipients
- ⏰ **Email Timing**: Configure what time to receive daily summaries
- 🎚️ **Source Control**: Enable/disable specific news sources
- 🎨 **Celebrity Tracking**: Automatically detects and highlights your favorite celebrities

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB of available RAM
- Port 3000 available (or configure a different port)

### Step 1: Clone or Download

```bash
# If using git
git clone <repository-url>
cd pop_culture_news_app

# Or download and extract the zip file
```

### Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your settings
nano .env  # or use any text editor
```

**Required Environment Variables:**

```env
# Database (auto-configured in Docker)
DATABASE_URL="postgresql://popculture:popculture_password@localhost:5432/popculture_db?schema=public"
POSTGRES_PASSWORD="popculture_password"

# Email Configuration (choose one method)

# Option 1: SMTP (Gmail example)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"  # Use App Password for Gmail
SMTP_FROM="your-email@gmail.com"

# Option 2: SendGrid (recommended for production)
# SENDGRID_API_KEY="your-sendgrid-api-key"
# SENDGRID_FROM="noreply@yourdomain.com"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # Change to your domain in production
DEFAULT_EMAIL_RECIPIENTS="dain.franklyn@icloud.com,jherria@hotmail.com"
DAILY_EMAIL_TIME="08:00"
REFRESH_INTERVAL="6"
```

### Step 3: Launch Application

```bash
# Start all services (database, app, cron jobs)
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Step 4: Access Application

Open your browser and navigate to:
- **Main App**: http://localhost:3000
- **Settings**: http://localhost:3000/settings

### Step 5: Initial Setup

1. Visit the Settings page (http://localhost:3000/settings)
2. Click **"🔄 Fetch News Now"** to load initial articles
3. Configure your preferences (email recipients, refresh frequency, etc.)
4. Send a test email to verify email configuration

That's it! The app is now running and will automatically:
- Fetch news at your configured interval (if using built-in cron)
- Send daily email summaries at your specified time (if using built-in cron)
- Learn from your ratings to improve recommendations

**Note**: By default, built-in cron jobs are **disabled**. See the [n8n Integration](#-n8n-integration-recommended) section below for the recommended scheduling approach.

## 🔄 n8n Integration (Recommended)

This app supports **n8n** for scheduling tasks instead of built-in cron jobs. n8n provides better monitoring, flexibility, and centralized automation management.

### Why Use n8n?

- ✅ **Visual workflow builder** - No cron syntax needed
- ✅ **Better monitoring** - See execution history and logs
- ✅ **Notifications** - Get alerts when tasks fail
- ✅ **Centralized** - Manage all automations in one place
- ✅ **Flexible** - Easy to modify schedules without restarting containers
- ✅ **Integrations** - Connect with Slack, Discord, email, etc.

### Quick Setup

1. **Configure Environment Variables**:
   ```env
   USE_BUILTIN_CRON=false  # Disable built-in cron (default)
   API_KEY=your-secure-api-key  # Generate with: openssl rand -base64 32
   ```

2. **Create n8n Workflows**:
   - **News Refresh**: Runs every 6 hours (configurable)
   - **Daily Email**: Runs once per day at your preferred time

3. **Full Instructions**: See [N8N_SETUP.md](./N8N_SETUP.md) for detailed step-by-step guide with workflow templates

### API Endpoints for n8n

The app exposes these API endpoints for external scheduling:

| Endpoint | Purpose | Method | Auth |
|----------|---------|--------|------|
| `/api/cron/fetch-news` | Fetch latest news | POST | Bearer token |
| `/api/cron/send-daily-email` | Send email summary | POST | Bearer token |

**Example n8n HTTP Request:**
```
Method: POST
URL: http://192.168.1.142:3000/api/cron/fetch-news
Headers:
  Authorization: Bearer your-api-key-here
```

### Using Built-in Cron Instead

If you prefer built-in cron jobs:
```env
USE_BUILTIN_CRON=true  # Enable built-in cron
```

The cron container will automatically:
- Fetch news at your configured `REFRESH_INTERVAL`
- Send emails at your configured `DAILY_EMAIL_TIME`

## 🏠 Self-Hosting on Home Computer

### Network Setup

**Note**: This setup assumes:
- nginx Proxy Manager is installed on: **192.168.1.236**
- Pop Culture App will be installed on: **192.168.1.142**

If you want to access the app from outside your home network:

1. **Configure Port Forwarding** on your router:
   - Forward external port 443 to nginx Proxy Manager IP (192.168.1.236) port 443
   - nginx will internally proxy to the app server (192.168.1.142)

2. **Set up Dynamic DNS** with DuckDNS:
   - Create a subdomain: `popculture.duckdns.org`
   - Configure DuckDNS to point to your external IP
   - Update `NEXT_PUBLIC_APP_URL` in `.env` to your DuckDNS domain

3. **Using nginx Proxy Manager**:
   ```nginx
   # Proxy Host Configuration
   Domain Names: popculture.yourdomain.com
   Scheme: http
   Forward Hostname / IP: 192.168.1.142  ← App server
   Forward Port: 3000
   ```

### Persistent Storage

All data is stored in Docker volumes:
```bash
# Backup database
docker-compose exec postgres pg_dump -U popculture popculture_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U popculture popculture_db < backup.sql
```

## 🛠️ Development Setup (Without Docker)

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Initialize database
node scripts/init-db.js

# Start development server
npm run dev

# In another terminal, start cron jobs
node scripts/cron-jobs.js
```

## 📧 Email Configuration

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password
3. Use this password in `SMTP_PASSWORD` environment variable

### SendGrid Setup (Recommended for Production)

1. Sign up for SendGrid (free tier: 100 emails/day)
2. Create an API key with "Mail Send" permissions
3. Verify your sender email
4. Use API key in `SENDGRID_API_KEY` environment variable

## 📱 Usage Guide

### Main Feed
- View personalized news articles
- Toggle between "Recommended" (AI-powered) and "Latest" (chronological)
- Rate articles using the star system (1-5 stars)
- Click "Read Full Article" to visit the original source
- Articles show credibility ratings and celebrity mentions

### Settings Page
- **General Settings**: Configure refresh interval and email timing
- **News Sources**: Enable/disable specific sources
- **Email Recipients**: Manage who receives daily summaries
- **Test Email**: Verify email configuration
- **Fetch News**: Manually trigger news fetch

### Rating System
- ⭐⭐⭐⭐⭐ (5 stars): Love it! Show me more like this
- ⭐⭐⭐⭐ (4 stars): Good content
- ⭐⭐⭐ (3 stars): Neutral
- ⭐⭐ (2 stars): Not interested
- ⭐ (1 star): Don't show similar content

The app learns from your ratings and shows more articles about:
- Celebrities you rate highly
- Sources you prefer
- Topics you engage with

## 🔧 Configuration

### News Sources

Default sources (configurable in Settings):
- **MediaTakeOut** (Credibility: 6/10) - Primary source
- **The Shade Room** (Credibility: 7/10)
- **Baller Alert** (Credibility: 7/10)
- **TMZ** (Credibility: 8/10)
- **E! News** (Credibility: 8/10)
- **People Magazine** (Credibility: 9/10)
- **Essence** (Credibility: 9/10)
- **The Root** (Credibility: 8/10)

### Refresh Intervals
- **4 hours**: Very frequent updates
- **6 hours** (recommended): Good balance
- **8 hours**: Moderate updates
- **12 hours**: Twice daily
- **24 hours**: Daily updates

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f app
docker-compose logs -f cron

# Restart specific service
docker-compose restart app

# Rebuild after code changes
docker-compose up -d --build

# Execute commands in container
docker-compose exec app sh
docker-compose exec postgres psql -U popculture popculture_db

# View database with Prisma Studio
docker-compose exec app npx prisma studio
```

## 📊 Database Management

```bash
# Access Prisma Studio (database GUI)
npx prisma studio

# Create a new migration
npx prisma migrate dev --name description

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View database
docker-compose exec postgres psql -U popculture popculture_db
```

## 🔐 Security Considerations

1. **Change Default Passwords**: Update `POSTGRES_PASSWORD` in `.env`
2. **Secure Email Credentials**: Use app passwords, not main passwords
3. **Add Authentication**: Consider adding user authentication for multi-user scenarios
4. **HTTPS**: Use nginx proxy manager or Cloudflare for SSL/TLS
5. **Rate Limiting**: Configure rate limiting in nginx for public access
6. **Firewall**: Only expose necessary ports

## 🆘 Troubleshooting

### App won't start
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :5432

# Check Docker logs
docker-compose logs app
docker-compose logs postgres

# Ensure database is ready
docker-compose exec postgres pg_isready -U popculture
```

### No articles loading
1. Visit Settings page
2. Check if sources are enabled
3. Click "Fetch News Now"
4. Check logs: `docker-compose logs cron`

### Email not sending
1. Verify SMTP credentials in `.env`
2. For Gmail, use App Password, not regular password
3. Check firewall allows SMTP ports (587, 465)
4. Test with "Send Test Email" in Settings
5. Check logs: `docker-compose logs app`

### Recommendations not working
- Rate at least 10-15 articles to train the algorithm
- Ensure "Enable personalized recommendations" is checked in Settings
- Clear browser cache and reload

## 🚀 Production Deployment

### On Your Home Server

1. **Update Environment Variables**:
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

2. **Use nginx Proxy Manager**:
   - Add proxy host for your domain
   - Enable SSL with Let's Encrypt
   - Force SSL and HTTP/2

3. **Set Up DuckDNS**:
   - Configure subdomain pointing to your external IP
   - Update router port forwarding

4. **Enable Auto-start**:
   ```bash
   # Add to systemd or use Docker restart policy
   docker-compose up -d --restart unless-stopped
   ```

### Monitoring

```bash
# View resource usage
docker stats

# Monitor logs
docker-compose logs -f --tail=100

# Check cron job execution
docker-compose logs cron | grep "Running scheduled"
```

## 📝 API Endpoints

The application includes REST API endpoints:

- `GET /api/articles` - Get articles (with pagination and filtering)
- `GET /api/articles/[id]` - Get single article
- `POST /api/ratings` - Submit article rating
- `GET /api/ratings` - Get user statistics
- `GET /api/settings` - Get app settings
- `PUT /api/settings` - Update settings
- `GET /api/sources` - Get news sources
- `PUT /api/sources` - Update source
- `POST /api/email/test` - Send test email
- `POST /api/cron/fetch-news` - Trigger news fetch (requires API key if set)
- `POST /api/cron/send-email` - Trigger email summary (requires API key if set)
- `POST /api/cron/send-daily-email` - Alias for send-email (requires API key if set)

**Note**: Cron endpoints require `Authorization: Bearer YOUR_API_KEY` header when `API_KEY` is configured in `.env`.

## 🤝 Contributing

This is a self-hosted personal application. Feel free to modify and customize for your needs!

## 📄 License

MIT License - Feel free to use and modify

## 💡 Tips & Best Practices

1. **Rate Consistently**: The more you rate, the better recommendations become
2. **Check Settings**: Configure refresh frequency based on your reading habits
3. **Manage Sources**: Disable sources you don't find useful
4. **Email Timing**: Set email time when you typically read news
5. **Backup Regularly**: Export database periodically
6. **Monitor Resources**: Ensure sufficient disk space for articles
7. **Update Dependencies**: Keep Docker images and npm packages updated

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review Docker/application logs
3. Verify environment variables
4. Ensure all services are running

---

Built with ❤️ for pop culture enthusiasts

**Note**: This application is designed for personal use. Please respect the terms of service of the news sources being aggregated.
