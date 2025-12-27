# API Documentation

Complete API reference for the Pop Culture News App. All endpoints return JSON and use standard HTTP status codes.

---

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

---

## Authentication

Most endpoints require authentication via JWT token.

### Headers
```
Authorization: Bearer <access_token>
```

Or via httpOnly cookie (automatic when using the web app).

### Token Lifecycle
- **Access Token**: Valid for 24 hours
- **Refresh Token**: Valid for 30 days

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // optional additional information
}
```

### Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limiting

All endpoints are rate-limited:
- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Max requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

---

## Public Endpoints

### Health Check

```http
GET /api/health
```

**Response**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

## Authentication Endpoints

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"  // optional
}
```

**Response (201)**
```json
{
  "user": {
    "id": "clxyz123...",
    "email": "user@example.com",
    "name": "John Doe",
    "isAdmin": false
  },
  "message": "Registration successful"
}
```

**Errors**
- 400: Email already exists
- 400: Invalid email format
- 400: Password too short

---

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200)**
```json
{
  "user": {
    "id": "clxyz123...",
    "email": "user@example.com",
    "name": "John Doe",
    "isAdmin": false
  },
  "message": "Login successful"
}
```

Sets httpOnly cookies: `access_token`, `refresh_token`

**Errors**
- 401: Invalid credentials

---

### Refresh Token

```http
POST /api/auth/refresh
```

Uses `refresh_token` cookie automatically.

**Response (200)**
```json
{
  "message": "Token refreshed"
}
```

Sets new `access_token` and `refresh_token` cookies.

**Errors**
- 401: Invalid or expired refresh token

---

### Logout

```http
POST /api/auth/logout
```

Clears auth cookies and revokes refresh token.

**Response (200)**
```json
{
  "message": "Logged out successfully"
}
```

---

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200)**
```json
{
  "id": "clxyz123...",
  "email": "user@example.com",
  "name": "John Doe",
  "isAdmin": false,
  "createdAt": "2025-01-15T10:30:00Z"
}
```

---

## Article Endpoints

### List Articles

```http
GET /api/articles
Authorization: Bearer <token>
```

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |
| category | string | - | Filter by category |
| source | string | - | Filter by source ID |
| search | string | - | Search in title/content |
| sortBy | string | publishDate | Sort field |
| order | string | desc | Sort order (asc/desc) |

**Response (200)**
```json
{
  "articles": [
    {
      "id": "clxyz123...",
      "title": "Celebrity News Story",
      "summary": "AI-generated summary...",
      "url": "https://source.com/article",
      "imageUrl": "https://source.com/image.jpg",
      "source": {
        "id": "src123",
        "name": "Entertainment Weekly"
      },
      "credibilityRating": 8,
      "publishDate": "2025-01-15T10:30:00Z",
      "categories": ["Movies", "Celebrities"],
      "celebrities": ["Actor Name"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### Get Single Article

```http
GET /api/articles/{id}
Authorization: Bearer <token>
```

**Response (200)**
```json
{
  "id": "clxyz123...",
  "title": "Celebrity News Story",
  "summary": "AI-generated summary...",
  "content": "Full article content...",
  "url": "https://source.com/article",
  "imageUrl": "https://source.com/image.jpg",
  "source": {
    "id": "src123",
    "name": "Entertainment Weekly",
    "credibilityRating": 8
  },
  "credibilityRating": 8,
  "publishDate": "2025-01-15T10:30:00Z",
  "categories": ["Movies", "Celebrities"],
  "celebrities": ["Actor Name"],
  "userRating": 4  // if user has rated
}
```

---

## Rating Endpoints

### Submit Rating

```http
POST /api/ratings
Authorization: Bearer <token>
Content-Type: application/json

{
  "articleId": "clxyz123...",
  "rating": 4,
  "feedback": "like"  // optional: "like" | "dislike"
}
```

**Response (201)**
```json
{
  "id": "rating123...",
  "articleId": "clxyz123...",
  "rating": 4,
  "feedback": "like",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

---

### Get User Ratings

```http
GET /api/ratings
Authorization: Bearer <token>
```

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max ratings to return |

**Response (200)**
```json
{
  "ratings": [
    {
      "id": "rating123...",
      "articleId": "clxyz123...",
      "rating": 4,
      "feedback": "like",
      "createdAt": "2025-01-15T10:30:00Z",
      "article": {
        "title": "Article Title",
        "publishDate": "2025-01-14T12:00:00Z"
      }
    }
  ]
}
```

---

## Source Endpoints

### List Sources

```http
GET /api/sources
Authorization: Bearer <token>
```

**Response (200)**
```json
{
  "sources": [
    {
      "id": "src123...",
      "name": "Entertainment Weekly",
      "url": "https://ew.com",
      "enabled": true,
      "credibilityRating": 8,
      "type": "rss",
      "articleCount": 245
    }
  ]
}
```

---

### Get Source Recommendations

```http
GET /api/sources/recommend
Authorization: Bearer <token>
```

Returns AI-powered source recommendations based on user preferences.

**Response (200)**
```json
{
  "recommendations": [
    {
      "source": {
        "id": "src123...",
        "name": "Variety",
        "url": "https://variety.com"
      },
      "reason": "Based on your interest in movie news",
      "score": 0.85
    }
  ]
}
```

---

## Settings Endpoints

### Get User Settings

```http
GET /api/settings
Authorization: Bearer <token>
```

**Response (200)**
```json
{
  "retentionDays": 30,
  "dailySummaryAt": "06:00",
  "preferredCategories": ["Movies", "Music"],
  "preferredCelebrities": ["Actor Name"]
}
```

---

### Update User Settings

```http
PUT /api/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "retentionDays": 60,
  "dailySummaryAt": "08:00",
  "preferredCategories": ["Movies", "Music", "Gaming"],
  "preferredCelebrities": ["Actor Name", "Singer Name"]
}
```

**Response (200)**
```json
{
  "message": "Settings updated",
  "settings": { ... }
}
```

---

## Email Endpoints

### Subscribe to Daily Digest

```http
POST /api/settings/emails
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@example.com",
  "active": true
}
```

**Response (201)**
```json
{
  "message": "Subscribed to daily digest",
  "email": "user@example.com"
}
```

---

### Test Email

```http
POST /api/email/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@example.com"
}
```

Sends a test email to verify configuration.

**Response (200)**
```json
{
  "message": "Test email sent"
}
```

---

## Cron Endpoints

These endpoints are typically called by scheduled jobs.

### Fetch News

```http
POST /api/cron/fetch-news
X-Cron-Secret: <cron_secret>
```

Triggers news fetching from all enabled sources.

**Response (200)**
```json
{
  "message": "Fetch completed",
  "articlesAdded": 25,
  "sources": 10
}
```

---

### Send Daily Email

```http
POST /api/cron/send-daily-email
X-Cron-Secret: <cron_secret>
```

Sends daily digest to all subscribed users.

**Response (200)**
```json
{
  "message": "Daily emails sent",
  "recipientCount": 150
}
```

---

## Admin Endpoints

All admin endpoints require admin privileges.

### Dashboard Stats

```http
GET /api/admin/stats
Authorization: Bearer <admin_token>
```

**Response (200)**
```json
{
  "stats": {
    "articles": { "total": 1500, "today": 25 },
    "users": { "total": 200, "active": 150 },
    "sources": 15,
    "ratings": 3000
  },
  "recentArticles": [...],
  "systemStatus": {
    "database": "connected",
    "cache": "connected",
    "email": "configured"
  }
}
```

---

### User Management

#### List Users
```http
GET /api/admin/users
Authorization: Bearer <admin_token>
```

#### Update User
```http
PUT /api/admin/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user123...",
  "isAdmin": true
}
```

#### Delete User
```http
DELETE /api/admin/users?id={userId}
Authorization: Bearer <admin_token>
```

---

### Source Management

#### List Sources (Admin)
```http
GET /api/admin/sources
Authorization: Bearer <admin_token>
```

#### Add Source
```http
POST /api/admin/sources
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "New Source",
  "url": "https://newsource.com",
  "type": "rss"
}
```

#### Update Source
```http
PUT /api/admin/sources
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "id": "src123...",
  "enabled": false,
  "credibilityRating": 7
}
```

#### Delete Source
```http
DELETE /api/admin/sources?id={sourceId}
Authorization: Bearer <admin_token>
```

---

### Database Operations

#### Get Database Stats
```http
GET /api/admin/database
Authorization: Bearer <admin_token>
```

**Response (200)**
```json
{
  "connectionStatus": "connected",
  "totalSize": "256 MB",
  "tables": [
    { "name": "Article", "rowCount": 1500, "size": "128 MB" },
    { "name": "User", "rowCount": 200, "size": "1 MB" }
  ],
  "lastBackup": "2025-01-15T00:00:00Z"
}
```

---

### Performance Metrics

```http
GET /api/admin/performance
Authorization: Bearer <admin_token>
```

**Response (200)**
```json
{
  "responseTime": { "avg": 45, "min": 12, "max": 250 },
  "requests": { "total": 10000, "success": 9800, "errors": 200 },
  "cache": { "hits": 8000, "misses": 2000, "hitRate": 80 },
  "system": {
    "memory": { "used": "512 MB", "total": "2 GB", "percentage": 25 },
    "cpu": 15,
    "uptime": "7d 12h 30m"
  }
}
```

---

### System Settings

#### Get Settings
```http
GET /api/admin/system
Authorization: Bearer <admin_token>
```

#### Update Settings
```http
PUT /api/admin/system
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fetchInterval": "60",
  "articlesPerFetch": "100",
  "emailEnabled": "true"
}
```

---

### Cleanup

```http
POST /api/admin/cleanup
Authorization: Bearer <admin_token>
```

Archives old articles and deletes expired tokens.

**Response (200)**
```json
{
  "message": "Cleanup completed",
  "archivedArticles": 150,
  "deletedTokens": 25
}
```

---

## Webhook Endpoints

### External Source Webhook

```http
POST /api/webhooks/source
X-Webhook-Secret: <webhook_secret>
Content-Type: application/json

{
  "source": "external-service",
  "articles": [
    {
      "title": "Article Title",
      "url": "https://...",
      "summary": "...",
      "publishDate": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

## Data Types

### Article
```typescript
interface Article {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url: string;
  imageUrl?: string;
  sourceId: string;
  credibilityRating: number;  // 1-10
  publishDate: string;        // ISO 8601
  categories: string[];
  celebrities: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### User
```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Source
```typescript
interface Source {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  credibilityRating: number;  // 1-10
  type: 'rss' | 'scrape' | 'api';
  isCustom: boolean;
  createdAt: string;
}
```

### Rating
```typescript
interface Rating {
  id: string;
  articleId: string;
  userId?: string;
  rating: number;    // 1-5
  feedback?: 'like' | 'dislike';
  createdAt: string;
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password })
});

// Fetch articles
const articles = await fetch('/api/articles?limit=20', {
  credentials: 'include'
}).then(r => r.json());

// Rate an article
await fetch('/api/ratings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ articleId, rating: 4 })
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}' \
  -c cookies.txt

# Get articles
curl http://localhost:3000/api/articles \
  -b cookies.txt

# Admin: Get stats
curl http://localhost:3000/api/admin/stats \
  -b cookies.txt
```

---

## OpenAPI Specification

Full OpenAPI 3.0 specification is available at:
```
GET /api/docs/openapi.json
```

Interactive documentation (if enabled):
```
GET /docs
```

---

*For implementation details, see the source code in `/app/api/`.*
