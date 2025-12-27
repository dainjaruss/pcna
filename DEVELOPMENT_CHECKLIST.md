# Pop Culture News App - Development Checklist

## Project Overview
- **Framework**: Next.js 14 (App Router), TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Docker Compose
- **Current Date**: December 26, 2025

## ✅ Completed Features

### Multi-User Profile System (Priority #1)
- [x] User registration and login system (email/password)
- [x] JWT authentication with secure tokens
- [x] Separate profiles with individual preferences and ratings
- [x] User-specific article feeds and recommendations
- [x] Secure authentication (JWT with refresh tokens)
- [x] Database schema updates (User, UserSetting, RefreshToken models)
- [x] Client-side token management with httpOnly cookies
- [x] Protected routes and middleware
- [x] User preferences (celebrities, categories) in profile
- [x] Personalized recommendations using user ratings + explicit preferences

### AI-Generated Daily Summary Article
- [x] AI summary button for individual articles (OpenAI GPT-4o-mini)
- [x] Fallback to text truncation when AI fails

### Basic Features (Already Working)
- [x] News aggregation from sources (MediaTakeOut, The Shade Room, TMZ, etc.)
- [x] PostgreSQL database with Prisma ORM
- [x] User rating system for articles
- [x] Daily email summaries (n8n integration)
- [x] Settings page for basic configurations
- [x] Docker deployment setup

## 🔄 In Progress

### Dynamic News Source Management (Priority #2)
- [x] Add form to input: source name, URL, RSS feed, credibility rating
- [x] Validate and test new sources before saving
- [x] Store custom sources in database
- [x] Make app multipurpose (not just pop culture)
- [x] Update database schema for custom sources
- [x] Modify news fetching to include custom sources
- [x] Update UI to show custom sources alongside predefined ones

### Article Search Functionality (Priority #4)
- [x] Search bar in UI to query local article database
- [x] Search by: keywords, date range, source, topic
- [x] Display relevant results with highlighting
- [x] Show "no results" message when applicable

### Fallback Web Search (Priority #5)
- [ ] Display "Search the web instead?" prompt when database search is empty
- [ ] Integrate web search API (configurable service)
- [ ] Display web results in similar format to local articles
- [ ] Option to save web results to database

### Automatic Article Retention Management (Priority #6)
- [ ] Setting to specify number of days to keep articles (default: 30 days)
- [ ] Automated cleanup job to purge articles older than retention period
- [ ] Option to archive instead of delete (optional)
- [ ] Preserve user ratings even after article deletion

### Enhanced Machine Learning Personalization (Priority #3)
- [ ] Analyze reading patterns (time spent, clicks, shares)
- [ ] Topic clustering and preference learning
- [ ] Collaborative filtering if multiple users
- [ ] Adjust article ranking based on learned preferences

## 📋 Next Priority Tasks

### Immediate Next Steps (Phase 1: Dynamic Source Management)
- [x] Create source management UI in settings page
- [x] Add form validation for new sources
- [x] Implement source testing functionality
- [x] Update database schema for custom sources
- [x] Modify news fetching to include custom sources
- [x] Update UI to display custom sources

### Phase 2: Article Search Functionality (Next Priority)
1. [ ] Add search bar component to main page
2. [ ] Implement search API endpoint
3. [ ] Add filtering options (date, source, topic)
4. [ ] Implement result highlighting
5. [ ] Add pagination for search results

### Phase 3: Web Search Fallback
1. [ ] Integrate web search API (Google/Bing/DuckDuckGo)
2. [ ] Create web search results component
3. [ ] Add "save to database" functionality
4. [ ] Implement search result caching

### Phase 4: Retention Management
1. [ ] Add retention settings to user/admin settings
2. [ ] Create cleanup cron job
3. [ ] Implement archiving system
4. [ ] Update rating preservation logic

### Phase 5: Enhanced ML Personalization
1. [ ] Add user interaction tracking
2. [ ] Implement topic clustering algorithm
3. [ ] Add collaborative filtering
4. [ ] Enhance recommendation scoring

## 🐛 Known Issues & Bugs
- [ ] None currently identified

## 📊 Testing Status
- [x] Authentication system tested and working
- [x] User preferences integration tested
- [x] Docker deployment verified
- [ ] Source management UI - Not tested
- [ ] Search functionality - Not tested
- [ ] Web search fallback - Not tested
- [ ] Retention management - Not tested
- [ ] Enhanced ML - Not tested

## 🔧 Technical Debt
- [ ] Add comprehensive error handling for API routes
- [ ] Implement rate limiting for all public endpoints
- [ ] Add input sanitization for all user inputs
- [ ] Add comprehensive logging
- [ ] Add unit tests for critical functions
- [ ] Add API documentation

## 📈 Performance Optimizations
- [ ] Implement database query optimization
- [ ] Add caching for frequently accessed data
- [ ] Optimize image loading and storage
- [ ] Implement lazy loading for article lists
- [ ] Add database indexes for search queries

## 🚀 Deployment Notes
- **Live URL**: http://192.168.1.142:3000
- **Database**: PostgreSQL in Docker
- **Reverse Proxy**: nginx-proxy-manager for HTTPS
- **Environment**: NODE_ENV=production
- **Last Deployed**: December 26, 2025

## 📝 Development Workflow
1. Make changes locally in `/mnt/server/pop_culture_news_app`
2. Test with `npm run dev`
3. Rebuild Docker: `docker compose up -d --no-deps --build app`
4. Verify functionality
5. Update this checklist
6. Commit changes

---
*Last Updated: December 26, 2025*</content>
<parameter name="filePath">/mnt/server/pop_culture_news_app/DEVELOPMENT_CHECKLIST.md