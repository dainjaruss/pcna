# 🔄 n8n Integration Guide for Pop Culture News App

This guide explains how to use n8n to schedule and automate the Pop Culture News App's tasks instead of using the built-in cron jobs.

## Table of Contents
- [Why Use n8n?](#why-use-n8n)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Workflow 1: News Refresh](#workflow-1-news-refresh)
- [Workflow 2: Daily Email Summary](#workflow-2-daily-email-summary)
- [Advanced Workflows](#advanced-workflows)
- [Troubleshooting](#troubleshooting)

---

## Why Use n8n?

**Benefits of using n8n over built-in cron:**
- 🎯 **Centralized Management**: Manage all your automations in one place
- 📊 **Visual Workflows**: See your automation flow visually
- 🔔 **Better Monitoring**: Get notifications when workflows fail
- 🔗 **Easy Integration**: Connect with other services (Slack, Discord, etc.)
- 🕐 **Flexible Scheduling**: More control over scheduling with n8n's UI
- 📝 **Execution History**: View logs and history of all executions
- 🔄 **Easy Updates**: Modify schedules without restarting containers

---

## Prerequisites

✅ **What you need:**
1. n8n installed and running on your network
2. Pop Culture News App running on **192.168.1.142:3000**
3. An API key for securing the endpoints (generated in Configuration step)
4. Network access from n8n to the Pop Culture App

---

## Configuration

### Step 1: Disable Built-in Cron Jobs

Edit your `.env` file on the Pop Culture App server (192.168.1.142):

```bash
# Add or update these settings
USE_BUILTIN_CRON=false  # Disable built-in cron
API_KEY=your-secure-random-api-key-here  # Generate a secure key
```

**Generate a secure API key:**
```bash
# On Linux/Mac
openssl rand -base64 32

# Or use an online generator
# Example: j8K9mN2pQ5rS8tU1vW4xY7zA3bC6dE9f
```

### Step 2: Restart the Application

```bash
cd /home/your-username/pop-culture-news
docker-compose down
docker-compose up -d
```

**Note**: You can now optionally disable the cron container:
```bash
# Edit docker-compose.yml and uncomment this line under the cron service:
# profiles: ["disabled"]

# Or just leave it - it will exit gracefully when USE_BUILTIN_CRON=false
```

### Step 3: Test API Endpoints

Verify the API endpoints are working:

```bash
# Test news fetch endpoint
curl -X POST http://192.168.1.142:3000/api/cron/fetch-news \
  -H "Authorization: Bearer your-api-key-here"

# Test email endpoint
curl -X POST http://192.168.1.142:3000/api/cron/send-daily-email \
  -H "Authorization: Bearer your-api-key-here"
```

**Expected response:**
```json
{
  "success": true,
  "message": "News fetch completed successfully",
  ...
}
```

---

## Workflow 1: News Refresh

This workflow fetches news from all configured sources at regular intervals.

### Recommended Schedule
- **Every 6 hours** (default): Good balance between freshness and API load
- Alternative: Every 4, 8, or 12 hours based on your preference

### n8n Workflow Setup

**1. Create a New Workflow in n8n**
   - Open n8n web interface
   - Click **"New Workflow"**
   - Name it: **"Pop Culture - News Refresh"**

**2. Add Schedule Trigger Node**
   - Click **"+"** to add a node
   - Search for and select **"Schedule Trigger"**
   - Configure:
     - **Trigger Interval**: `Hours`
     - **Hours Between Triggers**: `6` (or your preference)
     - **Trigger at Hour**: `0` (optional - to align to specific hours)
   - Alternative: Use Cron expression: `0 */6 * * *`

   **Visual Settings:**
   ```
   Node Name: "Every 6 Hours"
   Trigger Times: 00:00, 06:00, 12:00, 18:00
   ```

**3. Add HTTP Request Node**
   - Click **"+"** after the Schedule node
   - Search for and select **"HTTP Request"**
   - Configure:
     - **Method**: `POST`
     - **URL**: `http://192.168.1.142:3000/api/cron/fetch-news`
     - **Authentication**: `Header Auth`
       - **Name**: `Authorization`
       - **Value**: `Bearer your-api-key-here`
     - **Response Format**: `JSON`
     - **Timeout**: `60000` (60 seconds)

   **Visual Settings:**
   ```
   Node Name: "Fetch News API"
   Method: POST
   URL: http://192.168.1.142:3000/api/cron/fetch-news
   ```

**4. Add Error Handling (Optional but Recommended)**
   - Click **"+"** after HTTP Request node
   - Add **"IF"** node to check for errors
   - Configure:
     - **Condition**: `{{ $json.success }} is equal to true`
   
   **On Success Branch:**
   - Add a **"No Operation, do nothing"** node (or notification node)
   
   **On Error Branch:**
   - Add **"Send Email"** or **"Slack"** node to notify you
   - Example message: "Failed to fetch news: {{ $json.error }}"

**5. Save and Activate**
   - Click **"Save"** (top right)
   - Toggle the **"Active"** switch to ON
   - Test: Click **"Execute Workflow"** to run manually

### Complete Workflow JSON (Import This)

```json
{
  "name": "Pop Culture - News Refresh",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "hours",
              "hoursInterval": 6
            }
          ]
        }
      },
      "name": "Every 6 Hours",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://192.168.1.142:3000/api/cron/fetch-news",
        "authentication": "headerAuth",
        "headerAuth": "credentials",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer YOUR_API_KEY_HERE"
            }
          ]
        },
        "options": {
          "timeout": 60000
        }
      },
      "name": "Fetch News API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [450, 300]
    }
  ],
  "connections": {
    "Every 6 Hours": {
      "main": [
        [
          {
            "node": "Fetch News API",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true
}
```

**To Import:**
1. Copy the JSON above
2. In n8n, click **"..." (menu)** → **"Import from JSON"**
3. Paste the JSON
4. Replace `YOUR_API_KEY_HERE` with your actual API key
5. Save and activate

---

## Workflow 2: Daily Email Summary

This workflow sends a daily email summary of articles at a specific time.

### Recommended Schedule
- **Once per day** at your preferred time (e.g., 8:00 AM)

### n8n Workflow Setup

**1. Create a New Workflow in n8n**
   - Open n8n web interface
   - Click **"New Workflow"**
   - Name it: **"Pop Culture - Daily Email"**

**2. Add Cron Node**
   - Click **"+"** to add a node
   - Search for and select **"Schedule Trigger"**
   - Configure:
     - **Trigger Interval**: `Days`
     - **Days Between Triggers**: `1`
     - **Trigger at Hour**: `8` (for 8:00 AM)
     - **Trigger at Minute**: `0`
   - Or use Cron expression: `0 8 * * *` (every day at 8:00 AM)

   **Visual Settings:**
   ```
   Node Name: "Daily at 8 AM"
   Trigger Times: 08:00 every day
   Timezone: Your local timezone
   ```

**3. Add HTTP Request Node**
   - Click **"+"** after the Schedule node
   - Search for and select **"HTTP Request"**
   - Configure:
     - **Method**: `POST`
     - **URL**: `http://192.168.1.142:3000/api/cron/send-daily-email`
     - **Authentication**: `Header Auth`
       - **Name**: `Authorization`
       - **Value**: `Bearer your-api-key-here`
     - **Response Format**: `JSON`
     - **Timeout**: `30000` (30 seconds)

   **Visual Settings:**
   ```
   Node Name: "Send Daily Email API"
   Method: POST
   URL: http://192.168.1.142:3000/api/cron/send-daily-email
   ```

**4. Add Success Confirmation (Optional)**
   - Add **"IF"** node to check response
   - On success: Log or send confirmation notification
   - On failure: Send alert to you

**5. Save and Activate**
   - Click **"Save"** (top right)
   - Toggle the **"Active"** switch to ON
   - Test: Click **"Execute Workflow"** to run manually

### Complete Workflow JSON (Import This)

```json
{
  "name": "Pop Culture - Daily Email",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "days",
              "daysInterval": 1,
              "triggerAtHour": 8,
              "triggerAtMinute": 0
            }
          ]
        }
      },
      "name": "Daily at 8 AM",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://192.168.1.142:3000/api/cron/send-daily-email",
        "authentication": "headerAuth",
        "headerAuth": "credentials",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer YOUR_API_KEY_HERE"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "name": "Send Daily Email API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [450, 300]
    }
  ],
  "connections": {
    "Daily at 8 AM": {
      "main": [
        [
          {
            "node": "Send Daily Email API",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true
}
```

**To Import:**
1. Copy the JSON above
2. In n8n, click **"..." (menu)** → **"Import from JSON"**
3. Paste the JSON
4. Replace `YOUR_API_KEY_HERE` with your actual API key
5. Adjust the time if needed (default is 8:00 AM)
6. Save and activate

---

## Advanced Workflows

### Workflow 3: Smart News Refresh (Only During Waking Hours)

Don't waste resources fetching news at night!

**Cron Expression**: `0 6,9,12,15,18,21 * * *`
- Fetches at: 6 AM, 9 AM, 12 PM, 3 PM, 6 PM, 9 PM

**n8n Setup:**
- Use **Schedule Trigger** with Cron: `0 6,9,12,15,18,21 * * *`
- Same HTTP Request node as Workflow 1

---

### Workflow 4: Send Email Only on Weekdays

Only send emails Monday through Friday.

**Cron Expression**: `0 8 * * 1-5`
- Sends at 8 AM, Monday to Friday only

**n8n Setup:**
- Use **Schedule Trigger** with Cron: `0 8 * * 1-5`
- Same HTTP Request node as Workflow 2

---

### Workflow 5: Notification on New Celebrity Articles

Get notified when specific celebrities are mentioned.

**Nodes:**
1. **Schedule Trigger**: Every hour
2. **HTTP Request**: `GET http://192.168.1.142:3000/api/articles?limit=10`
3. **Filter**: Check for celebrity names in `celebrities` array
4. **Slack/Discord/Email**: Send notification with article details

---

### Workflow 6: Backup Articles Weekly

Export articles to a backup location.

**Nodes:**
1. **Schedule Trigger**: `0 2 * * 0` (Sunday at 2 AM)
2. **HTTP Request**: `GET http://192.168.1.142:3000/api/articles?limit=1000`
3. **Write to File** or **Upload to Cloud Storage**

---

## Monitoring and Notifications

### Add Slack Notifications

**1. Add Error Notification to News Refresh:**
   - After the HTTP Request node, add an **"IF"** node
   - Condition: `{{ $json.success }} is not equal to true`
   - Add **Slack** node on the "false" branch
   - Message: `⚠️ News refresh failed: {{ $json.error }}`

**2. Add Success Summary:**
   - On the "true" branch, add another **Slack** node
   - Message: `✅ News refresh completed! Fetched {{ $json.articlesCount }} articles`

### Add Email Notifications

Replace Slack nodes with **"Send Email"** nodes:
```
To: your-admin-email@example.com
Subject: Pop Culture News - {{ $json.success ? "Success" : "Failed" }}
Body: {{ $json.message }}
```

---

## Troubleshooting

### Issue: "Unauthorized - Invalid or missing API key"

**Solution:**
1. Verify your API key in `.env` matches the one in n8n
2. Check the Authorization header format: `Bearer YOUR_API_KEY`
3. Ensure there are no extra spaces in the API key

**Test:**
```bash
curl -v -X POST http://192.168.1.142:3000/api/cron/fetch-news \
  -H "Authorization: Bearer your-api-key-here"
```

---

### Issue: "Connection refused" or "Network error"

**Solution:**
1. Verify the Pop Culture App is running:
   ```bash
   docker-compose ps
   ```
2. Check if n8n can reach the app:
   ```bash
   # From the n8n server
   curl http://192.168.1.142:3000
   ```
3. Verify firewall settings allow traffic from n8n to the app
4. Check the URL in n8n matches: `http://192.168.1.142:3000`

---

### Issue: "Timeout" errors

**Solution:**
1. Increase timeout in n8n HTTP Request node to `60000` ms
2. Check if the news sources are responding slowly
3. View logs: `docker-compose logs app`

---

### Issue: n8n workflow runs but nothing happens

**Solution:**
1. Check n8n execution logs:
   - Click on the workflow execution in n8n
   - View the response from the HTTP Request node
2. Check app logs:
   ```bash
   docker-compose logs -f app
   ```
3. Verify the API endpoint returns success:
   ```json
   { "success": true, "message": "..." }
   ```

---

### Issue: Email not sending

**Solution:**
1. Verify email configuration in Pop Culture App `.env`:
   ```bash
   cat .env | grep SMTP
   ```
2. Test email directly:
   ```bash
   curl -X POST http://192.168.1.142:3000/api/email/test \
     -H "Content-Type: application/json" \
     -d '{"email":"your-test@email.com"}'
   ```
3. Check if email recipients are configured:
   - Go to: http://192.168.1.142:3000/settings
   - Verify email recipients are listed

---

## Testing Workflows

### Manual Testing

**1. Test News Refresh:**
```bash
curl -X POST http://192.168.1.142:3000/api/cron/fetch-news \
  -H "Authorization: Bearer your-api-key-here" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "News fetch completed successfully",
  "articlesCount": 42,
  "sources": ["TMZ", "MediaTakeOut", "The Shade Room"]
}
```

**2. Test Daily Email:**
```bash
curl -X POST http://192.168.1.142:3000/api/cron/send-daily-email \
  -H "Authorization: Bearer your-api-key-here" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Daily email sent successfully"
}
```

### Test in n8n

1. Open your workflow in n8n
2. Click **"Execute Workflow"** button
3. View the execution results
4. Check each node's output
5. Verify success messages

---

## Migrating from Built-in Cron

### Quick Migration Checklist

- [ ] Update `.env` with `USE_BUILTIN_CRON=false`
- [ ] Generate and add `API_KEY` to `.env`
- [ ] Restart docker containers
- [ ] Test API endpoints with curl
- [ ] Create "News Refresh" workflow in n8n
- [ ] Create "Daily Email" workflow in n8n
- [ ] Activate both workflows
- [ ] Test workflows manually
- [ ] Monitor for 24 hours to ensure they work
- [ ] (Optional) Disable cron container in docker-compose.yml

### Rollback Plan

If something goes wrong, you can easily revert:

1. **Enable Built-in Cron Again:**
   ```bash
   # Edit .env
   USE_BUILTIN_CRON=true
   
   # Restart containers
   docker-compose restart app cron
   ```

2. **Keep Both Running:**
   - You can run both n8n and built-in cron temporarily
   - Just ensure they don't run at the exact same time
   - Disable one after confirming the other works

---

## Best Practices

### 1. **Use Descriptive Workflow Names**
   - ✅ "Pop Culture - News Refresh (Every 6h)"
   - ❌ "Workflow 1"

### 2. **Add Workflow Notes**
   - Document what each workflow does
   - Add notes about timing decisions
   - Include contact info for issues

### 3. **Set Up Monitoring**
   - Add notification nodes to all workflows
   - Monitor n8n execution history
   - Set up alerts for failed executions

### 4. **Secure Your API Key**
   - Use a strong, random API key
   - Store it securely in n8n credentials
   - Don't commit it to version control
   - Rotate it periodically

### 5. **Test Before Deploying**
   - Always test workflows manually first
   - Verify API responses
   - Check that emails are being sent
   - Monitor logs for errors

### 6. **Document Custom Workflows**
   - If you create custom workflows, document them
   - Export and backup your n8n workflows
   - Share configurations with your team

---

## Additional Resources

### API Endpoints Reference

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/cron/fetch-news` | POST | Fetch news from all sources | Yes (Bearer token) |
| `/api/cron/send-email` | POST | Send daily email summary | Yes (Bearer token) |
| `/api/cron/send-daily-email` | POST | Alias for send-email | Yes (Bearer token) |
| `/api/articles` | GET | Get articles (with filtering) | No |
| `/api/settings` | GET | Get app settings | No |
| `/api/email/test` | POST | Send test email | No |

### n8n Documentation
- [Schedule Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/)
- [HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Cron Expression](https://crontab.guru/)

### Useful Cron Expressions
```
0 */6 * * *    # Every 6 hours
0 8 * * *      # Every day at 8 AM
0 9 * * 1-5    # Weekdays at 9 AM
0 */4 * * *    # Every 4 hours
0 6,12,18 * * * # At 6 AM, 12 PM, and 6 PM
0 0 * * 0      # Every Sunday at midnight
```

---

## Support

If you encounter issues:

1. **Check Logs:**
   ```bash
   # Pop Culture App logs
   docker-compose logs -f app
   
   # n8n logs (if running in Docker)
   docker logs -f n8n
   ```

2. **Verify Configuration:**
   ```bash
   # Check environment variables
   cat .env | grep -E "USE_BUILTIN_CRON|API_KEY"
   ```

3. **Test Connectivity:**
   ```bash
   # From n8n server, test connection
   curl http://192.168.1.142:3000
   ```

4. **Common Issues:**
   - Verify API key matches in both `.env` and n8n
   - Check network connectivity between n8n and the app
   - Ensure the app is running and healthy
   - Verify timezone settings in n8n

---

**Happy Automating! 🚀**

Remember: n8n gives you much more flexibility and control over your automations. You can always add more workflows, integrate with other services, and create custom notification systems as your needs grow.
