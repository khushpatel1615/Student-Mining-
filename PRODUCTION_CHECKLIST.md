# Production Deployment Checklist — Student Data Mining

## Environment
- [ ] .env file has APP_ENV=production
- [ ] .env file has strong JWT_SECRET (32+ random characters)
- [ ] DB_PASS is not empty
- [ ] ALLOWED_ORIGINS is set to production domain only
- [ ] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET updated for production domain
- [ ] .env is in .gitignore (NEVER commit this file)

## Server
- [ ] PHP 8.1+ installed and confirmed: `php -v`
- [ ] MySQL 8.0+ running and accessible
- [ ] /logs/ directory exists and is writable by PHP
- [ ] /cache/ directory exists and is writable by PHP
- [ ] /logs/.htaccess blocks browser access
- [ ] /cache/.htaccess blocks browser access
- [ ] Task Scheduler jobs configured per backend/cron/README.md

## Security
- [ ] All PHP endpoints return proper CORS headers
- [ ] JWT tokens expire in 24 hours (JWT_EXPIRY=86400 in .env)
- [ ] Admin endpoints verify role before responding
- [ ] Grade finalization requires admin or teacher role
- [ ] Unfinalization requires admin role only
- [ ] No raw SQL string concatenation anywhere (all PDO parameterized)
- [ ] display_errors = 0 in php.ini (already set in database.php)

## Database
- [ ] All Phase 6+7 migrations applied (phase6_7.sql)
- [ ] All indexes applied (from Phase 8 indexing step)
- [ ] vw_student_performance view exists
- [ ] programs.total_credits_required populated with real values per program

## Frontend
- [ ] Run: npm run build (confirm zero build errors)
- [ ] Check dist/ output deploys correctly
- [ ] Vite base URL set correctly for production in vite.config.js
- [ ] No hardcoded localhost URLs in any service file

## Monitoring (Post-Deploy)
- [ ] Open Admin Dashboard → System Health tab
- [ ] Confirm status shows "All Systems Operational"
- [ ] Confirm Database response < 100ms
- [ ] Send a test grade update and confirm email queue processes
- [ ] Check /logs/app-[today].log for any ERROR entries after first hour
