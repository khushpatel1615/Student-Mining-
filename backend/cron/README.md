# Cron Jobs — Windows Task Scheduler Setup

## Required Jobs

### 1. Email Queue Processor (Every 5 minutes)
- **Script**: `backend/cron/process_email_queue.php`
- **Purpose**: Sends pending notification emails to students and teachers

**Setup Steps:**
1. Open Task Scheduler (search "Task Scheduler" in Start menu)
2. Click "Create Basic Task"
3. Name: "SDM - Email Queue Processor"
4. Trigger: Daily → Repeat every 5 minutes (set in Advanced settings)
5. Action: Start a Program
   - Program: `C:\xampp\php\php.exe`
   - Arguments: `C:\xampp\htdocs\StudentDataMining\backend\cron\process_email_queue.php`
6. Finish. Right-click the task → Properties → Settings → 
   Check "Run task as soon as possible after scheduled start is missed"

### 2. Log Cleanup (Daily at 2:00 AM)
- **Script**: `backend/cron/cleanup_logs.php`
- Deletes log files older than 30 days to prevent disk bloat

**Setup Steps:** (same as above but)
- Trigger: Daily at 2:00 AM
- Program: `C:\xampp\php\php.exe`
- Arguments: `C:\xampp\htdocs\StudentDataMining\backend\cron\cleanup_logs.php`

### 3. Cache Cleanup (Every 30 minutes)
- **Script**: `backend/cron/cleanup_cache.php`
- Removes expired cache files

**Trigger**: Repeat every 30 minutes

## Verifying Jobs Are Running
Check the System Health dashboard in the Admin panel:
- Email Queue "Oldest Pending" should never exceed 10 minutes if cron is healthy
- If it exceeds 30 minutes, the email cron is not running

## Troubleshooting
- Ensure PHP path matches your XAMPP install location
- Run scripts manually first: `php backend/cron/process_email_queue.php`
- Check Task Scheduler History tab for execution errors
