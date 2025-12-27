# Known Bugs & Issues

This file tracks known bugs and issues in the Pop Culture News App.

---

## Open Issues

- [x] **BUG-004: Admin Dashboard System Status Incomplete** *(Resolved: 2025-12-27)*
  - **Severity**: Medium
  - **Component**: Admin Dashboard
  - **Description**: On dashboard, in the system status section, Health reports unknown, Database N/A, Cache N/A, and Last Fetch Never. The refresh button was clicked to perform fetch but nothing happens.
  - **Resolution**: Updated admin dashboard to properly fetch and map data from both /api/admin/stats and /api/health APIs. Added lastFetch from database. Modified refresh button to trigger news fetch via /api/cron/fetch-news with x-ui-trigger header.

- [x] **BUG-005: Admin Dashboard Stats Show Zero** *(Resolved: 2025-12-27)*
  - **Severity**: High
  - **Component**: Admin Dashboard
  - **Description**: On admin dashboard, Total articles, active users, news sources, and total ratings all report zero (which is incorrect).
  - **Resolution**: Fixed data mapping in admin dashboard to correctly extract stats from the nested API response structure (stats.articles.total, stats.users.total, etc.).

- [x] **BUG-006: Admin Navigation 404 Errors** *(Resolved: 2025-12-27)*
  - **Severity**: High
  - **Component**: Admin Navigation
  - **Description**: Receive 404 error when Database and Users are clicked in the left navigation pane.
  - **Resolution**: Created placeholder pages for /admin/database and /admin/users with basic UI and functionality.

- [x] **BUG-007: Admin Dashboard Data & Performance Issues** *(Resolved: 2025-12-27)*
  - **Severity**: Medium
  - **Component**: Admin User/Database/Performance Pages
  - **Description**: User management page shows fake user, Database management stats are placeholders, and Performance page shows fake fallback data when metrics are empty. Pages were not fetching real data due to missing credentials and fallback logic.
  - **Resolution**: 
    1. Updated User and Database pages to use `credentials: 'include'` to authenticate correctly.
    2. Updated Performance page to use `credentials: 'include'` and removed fake fallback values from API.
    3. Verified all pages now fetch and display real data from the system/database.

- [x] **BUG-003: Fallback to Web Search Not Functional** *(Resolved: 2025-12-27)*
  - **Severity**: Medium
  - **Component**: Web Search API
  - **Description**: The fallback to web search feature is not functional when local search returns no results. Button click did nothing.
  - **Resolution**: The UI now resets stale web results, surfaces DuckDuckGo/Redux errors, and only hides the fallback prompt when a successful web search response arrives so button presses reliably produce feedback.

- [x] **BUG-002: Search Button Stuck on "Searching"** *(Resolved: 2025-12-27)*
  - **Severity**: High
  - **Component**: Article Search
  - **Description**: When performing a search of the articles, the search button remains stuck on "Searching..." and never completes or shows results.
  - **Resolution**: Search loading state is now lifted into the home page so `SearchBar` can display a spinner label only while the backend is actually querying and the button is re-enabled immediately after results arrive.

- [x] **BUG-001: Admin Panel Access Unclear** *(Resolved: 2025-12-27)*
  - **Severity**: Medium
  - **Component**: Documentation / Admin Panel
  - **Description**: Unable or unclear how to access the admin panel.
  - **Resolution**: 
    1. Updated ADMIN_GUIDE.md with clear URL: `https://popcna.duckdns.org/admin`
    2. User must be logged in AND have `isAdmin = true` in database
    3. First admin must be set via database: `UPDATE "User" SET "isAdmin" = true WHERE email = 'your-email';`

---

## Bug Tracking Guidelines

### Adding New Bugs
Add new bugs to the "Open Issues" section:
```markdown
- [ ] **BUG-XXX: Brief Title**
  - **Severity**: Critical/High/Medium/Low
  - **Component**: Component Name
  - **Description**: Detailed description
```

### Resolving Bugs
Move to "Resolved Issues" and change `[ ]` to `[x]`:
```markdown
- [x] **BUG-XXX: Brief Title** *(Resolved: YYYY-MM-DD)*
  - **Resolution**: How it was fixed
```
