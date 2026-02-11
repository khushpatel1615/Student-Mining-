# Security Best Practices & Audit Report

> **Last Updated:** 2026-02-11  
> **System:** StudentDataMining v1.0  
> **Status:** 🔒 **CRITICAL SECURITY UPDATE - Secrets Rotation Required**

---

## 🚨 CRITICAL: Recent Security Actions (2026-02-11)

### Compromised Secrets Removed
The following secrets were found in uncommitted `.env` files and are now **TREATED AS COMPROMISED**:

1. **JWT_SECRET:** `student-data-mining-secret-key-2024-change-in-production`
2. **GEMINI_API_KEY:** `AIzaSyCCYtEH90pmAI7-DDjJ3e7_RpZMWq4MhG4`
3. **SMTP_PASS (Gmail App Password):** `czbqhkcpylrgnbpp`
4. **SMTP_USER:** `patel.khush1615.gnu@gmail.com`
5. **GOOGLE_CLIENT_ID:** `558182958130-dd2vsg1k4vrgheuua9oe1h0534586ps5.apps.googleusercontent.com`

### ✅ Actions Taken
- ✅ Removed `.env` files from future commits (already in `.gitignore`)
- ✅ Enhanced `.env.example` with comprehensive placeholders
- ✅ Added fail-fast validation for missing environment variables
- ✅ Enhanced server-side error logging (safe client messages)
- ✅ Updated SECURITY.md with rotation procedures

### ⚠️ REQUIRED ACTIONS BEFORE DEPLOYMENT

**YOU MUST complete these steps immediately:**

1. **Rotate ALL compromised secrets** (see rotation procedures below)
2. **Never commit `.env` files** to version control
3. **Review all team members** who had access to the repository
4. **Audit access logs** for unauthorized use of these credentials

---

## 🔄 Secret Rotation Procedures

### 1. JWT Secret Rotation

**Impact:** Invalidates all existing user sessions (users will need to re-login)

```bash
# Generate a new secure JWT secret (64+ characters)
# Linux/macOS:
openssl rand -base64 64

# Windows PowerShell:
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Steps:**
1. Generate new secret using above command
2. Update `JWT_SECRET` in `backend/.env`
3. Clear `user_sessions` table (optional, or wait for natural expiry)
4. Notify users they may need to re-login

```sql
-- Optional: Clear all sessions
TRUNCATE TABLE user_sessions;
```

---

### 2. Google Gemini API Key Rotation

**Impact:** AI Chat feature will be temporarily unavailable

**Steps:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Revoke** the old API key: `AIzaSyCCYtEH90pmAI7-DDjJ3e7_RpZMWq4MhG4`
3. Create a new API key
4. Update `GEMINI_API_KEY` in `backend/.env`
5. Test AI Chat functionality

---

### 3. Gmail SMTP Credentials Rotation

**Impact:** Email notifications will be temporarily unavailable

**Steps:**
1. Go to [Google Account App Passwords](https://myaccount.google.com/apppasswords)
2. **Revoke** the old app password
3. Generate a new app password
4. **Consider:** Using a dedicated email account for system notifications (not personal email)
5. Update in `backend/.env`:
   ```bash
   SMTP_USER=new-system-email@gmail.com
   SMTP_PASS=new_app_password_here
   SMTP_FROM=new-system-email@gmail.com
   ```

**⚠️ RECOMMENDATION:** Create a new dedicated Gmail account for system emails:
- Example: `studentdatamining-alerts@gmail.com`
- Enable 2FA and create an App Password
- Do NOT use personal email accounts

---

### 4. Google OAuth Client Rotation (If Used)

**Impact:** Users cannot use "Sign in with Google" temporarily

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. **Delete or regenerate** the old OAuth client
3. Create new OAuth 2.0 Client ID
4. Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`
5. Update `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` (if applicable)

---

### 5. Database Password Rotation

**Impact:** Application will be unavailable during rotation

**Steps:**
1. Connect to MySQL as root
2. Change password for application database user:
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_strong_password';
   FLUSH PRIVILEGES;
   ```
3. Update `DB_PASS` in `backend/.env`
4. Test database connectivity

---

## 🔐 Environment Variables Management

### Required Environment Variables

All environment variables are defined in `backend/.env.example`. **DO NOT** modify `.env.example` with real secrets!

#### Critical Variables (Required)
- `JWT_SECRET` - Must be 64+ random characters
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` - Database credentials
- `ALLOWED_ORIGINS` - Comma-separated list of allowed frontend URLs
- `GEMINI_API_KEY` - For AI Chat feature
- `SMTP_*` - For email notifications (6 variables)

#### Optional Variables
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth sign-in

### Environment Variable Validation

The system now **fails fast** with clear error messages when required variables are missing:

**Server-side (error_log):**
```
CRITICAL: Missing required environment variables: JWT_SECRET, GEMINI_API_KEY
Please check your .env file and ensure all required variables are set.
```

**Client-side (API response):**
```json
{
  "success": false,
  "error": "Server configuration error. Please contact administrator."
}
```

### Setup Instructions

1. **Copy example files:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. **Generate secure secrets:**
   ```bash
   # JWT Secret (64+ characters)
   openssl rand -base64 64
   ```

3. **Configure all required variables** in `backend/.env`

4. **Never commit `.env` files**:
   ```bash
   # Verify .env is ignored
   git status
   # Should NOT show backend/.env or frontend/.env
   ```

5. **Test configuration:**
   ```bash
   # Check server logs for any CRITICAL errors
   tail -f /path/to/php_error.log
   ```

---

## ⛔ DO NOT COMMIT SECRETS - CRITICAL RULES

### 1. Never Commit These Files
- ❌ `backend/.env`
- ❌ `frontend/.env`
- ❌ Any file containing real API keys, passwords, or secrets
- ✅ `backend/.env.example` (with placeholders only)
- ✅ `frontend/.env.example` (with placeholders only)

### 2. Before Every Commit
```bash
# Check what you're about to commit
git status
git diff --cached

# Ensure no .env files are staged
git ls-files | grep "\.env$"
# Should return NOTHING (only .env.example files are OK)
```

### 3. If You Accidentally Commit Secrets

**IMMEDIATELY do the following:**

```bash
# DO NOT just delete the file in a new commit - it's still in history!

# 1. Remove from current commit (if not pushed)
git reset HEAD backend/.env
git commit --amend

# 2. If already pushed, contact team lead immediately
# 3. Rotate ALL secrets that were exposed
# 4. Use git-filter-branch or BFG Repo-Cleaner to remove from history
```

### 4. Team Guidelines
- **CODE REVIEW:** Always check for secrets before approving PRs
- **AUTOMATED CHECKS:** Consider using pre-commit hooks (e.g., `detect-secrets`)
- **ONBOARDING:** Train new developers on secret management
- **INCIDENT RESPONSE:** Report any secret exposure immediately

---



## ✅ Implemented Security Measures

### 1. **Authentication & Authorization**

#### JWT-Based Authentication
- ✅ **Stateless JWT tokens** with configurable expiry (default: 24 hours)
- ✅ **Role-based access control (RBAC)** - student, teacher, admin
- ✅ **Protected endpoints** via `requireAuth()` and `requireRole()` helpers
- ✅ **Secure password hashing** using PHP's `password_hash()` (bcrypt)

**Location:** `backend/includes/jwt.php`

#### Session Management
- ✅ **Token hash storage** in `user_sessions` table
- ✅ **Automatic expiration** - tokens expire after `JWT_EXPIRY` seconds
- ✅ **Revocation support** - invalidate tokens on logout

---

### 2. **Database Security**

#### SQL Injection Prevention
- ✅ **Prepared statements** used throughout the codebase
- ✅ **PDO with parameter binding** - no raw SQL concatenation
- ✅ **Input sanitization** before database operations

**Example:**
```php
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]); // Safe from injection
```

#### Connection Security
- ✅ **Environment-based credentials** - no hardcoded passwords
- ✅ **UTF-8 charset** (utf8mb4) for proper Unicode support
- ✅ **Connection error masking** - generic error messages to users

---

### 3. **Cross-Origin Resource Sharing (CORS)**

#### Secure CORS Configuration
- ✅ **Single allowed origin** from `.env` (no wildcard `*`)
- ✅ **Credentials support** properly configured
- ✅ **Centralized CORS handler** in `backend/config/cors.php`
- ✅ **Preflight OPTIONS** handled correctly
- ✅ **Security headers** (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

**Location:** `backend/config/cors.php`

**Configuration:**
```php
ALLOWED_ORIGIN=http://localhost:5173  // Development
ALLOWED_ORIGIN=https://yourdomain.com // Production
```

---

### 4. **API Security**

#### Rate Limiting
- ✅ **AI Chat endpoint** rate-limited (10 requests/minute per user)
- ✅ **File-based tracking** for simplicity (upgrade to Redis in production)

**Location:** `backend/api/ai_chat.php` (lines 14-38)

#### Input Validation
- ✅ **Input length limits** (e.g., AI chat messages limited to 2000 chars)
- ✅ **Strip tags** to prevent HTML/script injection
- ✅ **Type validation** for JSON payloads

#### HTTPS/SSL
- ✅ **SSL verification enabled** for external API calls (Google Gemini)
- ⚠️ **Development uses HTTP** - must enable HTTPS in production

---

### 5. **File Upload Security**

#### Upload Validation
- ✅ **File type restrictions** (assignments: pdf, doc, docx, zip)
- ✅ **File size limits** enforced
- ✅ **Unique file naming** to prevent overwrites
- ✅ **Storage outside web root** (backend/uploads/)

**Location:** `backend/api/assignments/submit.php`

---

### 6. **Environment Variables & Secrets**

#### Secure Configuration
- ✅ **All secrets in `.env` files**
- ✅ **`.env` excluded from git** (in .gitignore)
- ✅ **Separate .env.example** for documentation
- ✅ **EnvLoader** validates required variables

**Critical Secrets:**
- `JWT_SECRET` - Must be 32+ characters, randomly generated
- `DB_PASS` - Database password
- `GEMINI_API_KEY` - AI service key
- `GOOGLE_CLIENT_SECRET` - OAuth secret

---

### 7. **Frontend Security**

#### Client-Side Security
- ✅ **No secrets in frontend** - only `VITE_*` public variables
- ✅ **API calls authenticated** with JWT in Authorization header
- ✅ **Input sanitization** before sending to backend
- ✅ **XSS protection** - React automatically escapes content

#### Token Storage
- ✅ **localStorage** for JWT (simple, but vulnerable to XSS)
- ⚠️ **Consider httpOnly cookies** for enhanced security

---

## ⚠️ Security Recommendations

### For Production Deployment

#### 1. **Enable HTTPS**
```apache
# .htaccess - Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

#### 2. **Strengthen JWT Secret**
```bash
# Generate secure random secret (Linux/macOS)
openssl rand -base64 48

# Windows PowerShell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

#### 3. **Database User Permissions**
```sql
-- Create dedicated database user with minimal permissions
CREATE USER 'sdm_app'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON student_data_mining.* TO 'sdm_app'@'localhost';
FLUSH PRIVILEGES;

-- Update .env
DB_USER=sdm_app
DB_PASS=strong_password_here
```

#### 4. **PHP Security Settings**
```ini
; php.ini (Production)
display_errors = Off
log_errors = On
error_log = /var/log/php_errors.log
expose_php = Off
session.cookie_httponly = 1
session.cookie_secure = 1
```

#### 5. **Rate Limiting (Production-Grade)**
```php
// Replace file-based rate limiting with Redis
// Install php-redis extension
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

$key = "rate_limit:ai_chat:$userId";
$requests = $redis->incr($key);
if ($requests == 1) {
    $redis->expire($key, 60); // 60 seconds
}
if ($requests > 10) {
    http_response_code(429);
    exit(json_encode(['error' => 'Rate limit exceeded']));
}
```

#### 6. **Content Security Policy (CSP)**
```apache
# .htaccess - Add CSP headers
Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
```

#### 7. **Login Attempt Throttling**
```php
// Implement in backend/api/login.php
// Track failed attempts per IP/email
// Lock account after 5 failed attempts
// Implement CAPTCHA after 3 failures
```

#### 8. **Audit Logging**
```php
// Log all critical actions
function logAudit($userId, $action, $details) {
    global $pdo;
    $stmt = $pdo->prepare("INSERT INTO audit_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)");
    $stmt->execute([$userId, $action, json_encode($details), $_SERVER['REMOTE_ADDR']]);
}

// Usage
logAudit($userId, 'grade_updated', ['student_id' => $studentId, 'subject_id' => $subjectId]);
```

---

## 🔍 Manual Security Audit Checklist

### Before Production Deployment

- [ ] **JWT_SECRET** is a strong random string (48+ chars)
- [ ] **DB_PASS** uses a strong, unique password
- [ ] **HTTPS** is enabled and enforced
- [ ] **Error reporting** disabled in production (`display_errors = Off`)
- [ ] **Default passwords** changed for all test accounts
- [ ] **File upload directory** permissions set to 755 (not 777)
- [ ] **`.env` files** excluded from git and not accessible via web
- [ ] **CORS** restricted to production domain only
- [ ] **Rate limiting** implemented for login and API endpoints
- [ ] **Session timeout** configured appropriately
- [ ] **Database backups** automated and tested
- [ ] **SSL certificate** valid and not self-signed
- [ ] **Admin panel** protected with additional authentication layer
- [ ] **Sensitive API keys** rotated regularly
- [ ] **Security headers** configured (CSP, HSTS, X-Frame-Options)

---

## 🛡️ Vulnerability Mitigation

### Common Attack Vectors

| Attack | Mitigation | Status |
|--------|-----------|--------|
| **SQL Injection** | Prepared statements, parameter binding | ✅ Implemented |
| **XSS (Cross-Site Scripting)** | React auto-escaping, strip_tags on input | ✅ Implemented |
| **CSRF (Cross-Site Request Forgery)** | CORS restrictions, JWT authentication | ✅ Implemented |
| **Brute Force Login** | Rate limiting needed | ⚠️ Recommended |
| **Session Hijacking** | HTTPS, httpOnly cookies, token expiry | ⚠️ Partial |
| **File Upload Exploits** | Type/size validation, safe storage | ✅ Implemented |
| **Information Disclosure** | Error masking, no debug output | ✅ Implemented |
| **MITM (Man-in-the-Middle)** | HTTPS required | ⚠️ Dev uses HTTP |
| **API Key Exposure** | .env files, .gitignore | ✅ Implemented |

---

## 📋 Security Update Log

| Date | Update | Severity |
|------|--------|----------|
| 2026-02-11 | **CRITICAL:** Removed committed secrets, enhanced env validation | Critical |
| 2026-02-11 | Added fail-fast validation with server-side logging | High |
| 2026-02-11 | Updated .env.example with all SMTP variables | Medium |
| 2026-02-11 | Enhanced GEMINI_API_KEY validation | Medium |
| 2026-01-26 | Enabled SSL verification in AI endpoint | Medium |
| 2026-01-26 | Centralized CORS configuration | High |
| 2026-01-26 | Enhanced .env.example with security notes | Low |
| 2026-01-26 | Improved .gitignore patterns | Medium |


---

## 🚨 Incident Response

### In Case of Security Breach

1. **Immediate Actions:**
   - Rotate `JWT_SECRET` (invalidates all tokens)
   - Reset all user passwords
   - Review audit logs for suspicious activity
   - Take database backup

2. **Investigation:**
   - Check `error_log` for anomalies
   - Review `grade_history` and `import_logs` tables
   - Analyze access logs (Apache/Nginx)

3. **Recovery:**
   - Patch vulnerability
   - Restore from clean backup if needed
   - Notify affected users
   - Update this document

---

## 📞 Security Contacts

- **Lead Developer:** [Your Name/Email]
- **Security Team:** [security@yourdomain.com]
- **Emergency Hotline:** [Phone Number]

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PHP Security Best Practices](https://www.php.net/manual/en/security.php)
- [React Security](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [MySQL Security](https://dev.mysql.com/doc/refman/8.0/en/security.html)

---

**Last Reviewed:** 2026-02-11  
**Next Review Due:** 2026-05-11 (Quarterly)
