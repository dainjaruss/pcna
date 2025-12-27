# Administrator Guide

This guide covers the administration features of the Pop Culture News App, including system management, user administration, and maintenance operations.

---

## Table of Contents

1. [Admin Access](#admin-access)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [Source Management](#source-management)
5. [Database Operations](#database-operations)
6. [Performance Monitoring](#performance-monitoring)
7. [System Settings](#system-settings)
8. [Maintenance Tasks](#maintenance-tasks)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Admin Access

### Becoming an Admin
Admin privileges are granted by:
1. An existing admin user via User Management
2. Direct database update (initial setup only)

### Accessing the Admin Panel

**Admin Panel URL**: `https://your-domain.com/admin`

For the production instance: **https://popcna.duckdns.org/admin**

**Steps to access**:
1. Log in with an admin account at `/login`
2. Navigate directly to `/admin` in your browser
3. Or click **Admin Panel** in the navigation (if visible)
4. The admin layout will verify your access automatically

> **Note**: You must have admin privileges to access the admin panel. Regular users will be redirected.

### Admin-Only Features
- User management (promote/demote, delete)
- System-wide settings
- Database operations
- Performance monitoring
- Source management
- Cleanup operations

---

## Dashboard Overview

The admin dashboard (`/admin`) provides a quick overview of system status.

### Stats Cards
| Card | Description |
|------|-------------|
| **Total Articles** | All articles in the database |
| **Today's Articles** | Articles fetched today |
| **Total Users** | Registered user count |
| **Active Users** | Users active in last 7 days |
| **Sources** | Number of news sources |
| **Ratings** | Total user ratings submitted |

### System Status
- **Database**: Connection status (connected/error)
- **Cache**: Redis connection status
- **Email**: Email service configuration status

### Quick Actions
| Action | Description |
|--------|-------------|
| **Fetch News** | Trigger immediate news fetch from all sources |
| **Send Daily Email** | Manually trigger daily digest emails |
| **Clear Cache** | Flush Redis cache (requires confirmation) |
| **Run Cleanup** | Archive old articles and delete expired tokens |

---

## User Management

Access via `/admin/users`

### Viewing Users
The user table displays:
- User email and name
- Role (Admin/User)
- Ratings count
- Join date
- Last active time

### Filtering Users
- **Search**: By email or name
- **Filter**: All / Admins Only / Regular Users

### User Actions

#### Promote to Admin
1. Find the user in the table
2. Click the shield icon
3. Confirm the promotion

#### Revoke Admin Access
1. Find the admin user
2. Click the shield icon
3. Confirm the revocation

> ⚠️ **Warning**: Be careful not to revoke your own admin access if you're the only admin.

#### Delete User
1. Click the trash icon next to the user
2. Confirm deletion
3. User and all their data will be permanently removed

> ⚠️ **Warning**: This action cannot be undone. User's ratings, preferences, and history will be deleted.

---

## Source Management

Access via `/admin/sources`

### Viewing Sources
The source table displays:
- Source name and URL
- Type (RSS, Scrape, API)
- Enabled status
- Credibility rating (1-10)
- Article count
- Custom source indicator

### Adding a New Source
1. Click **Add Source**
2. Fill in the form:
   - **Name**: Display name for the source
   - **URL**: Source website URL
   - **Type**: RSS (recommended), Scrape, or API
3. Click **Add Source**

New sources start with:
- Enabled: Yes
- Credibility Rating: 5 (neutral)
- Custom: Yes

### Enabling/Disabling Sources
Toggle the switch in the source row to enable or disable news fetching from that source.

### Updating Credibility
1. Click the credibility refresh icon
2. This triggers an AI-based credibility assessment
3. The new score will be updated automatically

### Deleting Sources
1. Click the trash icon (only available for custom sources)
2. Confirm deletion
3. Associated articles remain in the database

---

## Database Operations

Access via `/admin/database`

### Database Status
- **Connection Status**: Current database health
- **Total Size**: Database storage used
- **Last Backup**: Most recent backup timestamp

### Tables Overview
View row counts and sizes for all database tables:
- Article
- User
- Source
- UserRating
- UserInteraction
- Setting
- RefreshToken

### Available Actions

#### Backup
Creates a database backup. In production, this triggers your configured backup solution.

#### Optimize (VACUUM)
Reclaims storage and updates statistics for query optimization. Run periodically (weekly recommended).

#### Cleanup Old Data
Removes:
- Articles older than retention period
- Expired refresh tokens
- Orphaned records

#### Archive
Moves old articles to archived status instead of deleting.

---

## Performance Monitoring

Access via `/admin/performance`

### Response Time Metrics
- **Average**: Mean response time (ms)
- **Min**: Fastest response
- **Max**: Slowest response

### Request Statistics
- **Total Requests**: Lifetime request count
- **Success**: Successful responses (2xx)
- **Errors**: Failed responses (4xx, 5xx)

### Cache Metrics
- **Cache Hits**: Requests served from cache
- **Cache Misses**: Requests requiring fresh data
- **Hit Rate**: Percentage of cached responses

### System Resources
- **Memory Usage**: Current memory consumption
- **CPU Load**: Normalized CPU utilization
- **Uptime**: Server uptime since last restart

### Auto-Refresh
Performance data refreshes every 30 seconds automatically. Click **Refresh** for immediate update.

---

## System Settings

Access via `/admin/system`

### News Fetching Settings
| Setting | Description | Default |
|---------|-------------|---------|
| **Fetch Interval** | Minutes between news fetches | 30 |
| **Articles Per Fetch** | Maximum articles to fetch per source | 50 |
| **Content Retention** | Days to keep articles | 30 |

### Email Settings
| Setting | Description | Default |
|---------|-------------|---------|
| **Daily Digest Time** | When to send daily emails | 06:00 |
| **Articles Per Email** | Maximum articles in digest | 10 |
| **Email Enabled** | Master email toggle | Yes |

### Personalization Settings
| Setting | Description | Default |
|---------|-------------|---------|
| **Recommendation Weight** | ML recommendation influence | 0.7 |
| **New User Boost** | Diversity boost for new users | Yes |

### Security Settings
| Setting | Description | Default |
|---------|-------------|---------|
| **API Rate Limit** | Requests per 15 minutes | 100 |
| **Session Timeout** | Hours before session expires | 24 |

### System Actions
- **Clear Cache**: Flush all cached data
- **Reset Settings**: Restore all settings to defaults
- **Restart Services**: Trigger service restart (if configured)

---

## Maintenance Tasks

### Daily Tasks
- [ ] Check dashboard for any anomalies
- [ ] Review error logs if issues reported
- [ ] Verify news fetch is running

### Weekly Tasks
- [ ] Run database optimization (VACUUM)
- [ ] Review performance metrics trends
- [ ] Check disk space usage
- [ ] Review user growth and activity

### Monthly Tasks
- [ ] Full database backup verification
- [ ] Review and update source credibility ratings
- [ ] Clean up old archived articles
- [ ] Security audit review
- [ ] Update dependencies if needed

### Cleanup Commands

**Archive Old Articles**
```bash
curl -X POST http://localhost:3000/api/admin/cleanup \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{"action": "archive"}'
```

**Clear Expired Tokens**
```bash
curl -X POST http://localhost:3000/api/admin/cleanup \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{"action": "tokens"}'
```

---

## Security Best Practices

### Admin Account Security
1. **Use Strong Passwords**: Minimum 12 characters, mixed case, numbers, symbols
2. **Limit Admin Accounts**: Only grant admin to those who need it
3. **Regular Review**: Periodically audit admin user list

### Access Management
1. **Monitor Failed Logins**: Check logs for brute force attempts
2. **Session Management**: Keep session timeout reasonable (24h default)
3. **Rate Limiting**: Don't disable rate limiting in production

### Data Protection
1. **Regular Backups**: Ensure automated backups are running
2. **Test Restores**: Periodically verify backup integrity
3. **Encryption**: Use HTTPS in production

### Incident Response
1. If you suspect a breach:
   - Immediately revoke all refresh tokens
   - Force all users to re-authenticate
   - Review access logs
   - Reset admin passwords
2. Document the incident
3. Notify affected users if necessary

---

## Troubleshooting

### Dashboard Not Loading
1. Verify you have admin access
2. Check browser console for errors
3. Verify API endpoints are responding
4. Check database connection

### News Not Fetching
1. Check source enabled status
2. Verify source URLs are accessible
3. Check server logs for fetch errors
4. Verify cron jobs are running (if applicable)

### Users Not Receiving Emails
1. Check email service configuration (Resend API key)
2. Verify email is enabled in system settings
3. Check email logs for delivery errors
4. Verify user has opted in to emails

### High Memory Usage
1. Run database cleanup
2. Clear cache
3. Check for memory leaks in logs
4. Consider increasing server resources

### Slow Performance
1. Check cache hit rate (aim for >80%)
2. Run database optimization
3. Review slow queries in logs
4. Check external API response times

### Database Connection Issues
1. Verify DATABASE_URL is correct
2. Check PostgreSQL is running
3. Verify network connectivity
4. Check connection pool settings

---

## API Reference for Admins

### Admin Stats
```
GET /api/admin/stats
Response: { stats, recentArticles, systemStatus }
```

### User Management
```
GET /api/admin/users
PUT /api/admin/users { userId, isAdmin }
DELETE /api/admin/users?id={userId}
```

### Source Management
```
GET /api/admin/sources
POST /api/admin/sources { name, url, type }
PUT /api/admin/sources { id, enabled, credibilityRating }
DELETE /api/admin/sources?id={sourceId}
```

### Database Operations
```
GET /api/admin/database
POST /api/admin/database/{action}
  Actions: backup, vacuum, cleanup, archive
```

### Performance Metrics
```
GET /api/admin/performance
```

### System Settings
```
GET /api/admin/system
PUT /api/admin/system { ...settings }
```

### Cleanup
```
POST /api/admin/cleanup
```

---

## Logs and Monitoring

### Log Locations
- **Combined Logs**: `logs/combined-{date}.log`
- **Error Logs**: `logs/error-{date}.log`

### Log Format
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "info",
  "message": "User logged in",
  "userId": "clxyz...",
  "ip": "192.168.1.1"
}
```

### Monitoring Security Events
Watch for these log patterns:
- `login_failure` - Failed login attempts
- `rate_limit_exceeded` - Rate limit violations
- `unauthorized_access` - Access denied events
- `suspicious_activity` - Anomalous behavior

---

*For technical documentation, see the [API Documentation](./API_DOCUMENTATION.md) and [Deployment Guide](../DEPLOYMENT_GUIDE.md).*
