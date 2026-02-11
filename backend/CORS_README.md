# CORS Security Implementation

This document describes the CORS (Cross-Origin Resource Sharing) security implementation for the Student Data Mining backend API.

## 🔒 Security Requirements Implemented

### 1. Origin Allowlisting
- ✅ Reads allowed origins from `ALLOWED_ORIGINS` environment variable
- ✅ Supports comma-separated list of origins
- ✅ Strict comparison - only exact matches are allowed
- ✅ No fallback to wildcard or default origins

### 2. Preflight Request Handling
- ✅ OPTIONS requests from allowed origins return 200 OK with CORS headers
- ✅ OPTIONS requests from disallowed origins return **403 Forbidden** with no CORS headers
- ✅ Exits early after handling preflight to prevent unnecessary processing

### 3. Credentials Safety
- ✅ Never uses wildcard (`*`) for `Access-Control-Allow-Origin` when `Access-Control-Allow-Credentials: true`
- ✅ Always returns the specific origin that made the request (if allowed)

### 4. Request Blocking
- ✅ If origin is NOT in allowlist, NO `Access-Control-Allow-Origin` header is set
- ✅ Browser will block the response due to CORS policy violation
- ✅ For preflight (OPTIONS), server actively rejects with 403

## 📝 Configuration

### Environment Variables

Add to `backend/.env`:

```env
# CORS Configuration
# Comma-separated list of allowed frontend URLs
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com
```

### Configuration File

The CORS configuration is in `backend/config/cors.php` and is automatically loaded by `backend/config/database.php`, which is included by all API endpoints.

## 🧪 Testing

### Method 1: Automated PHP Tests

**Note:** Due to PHP header limitations in CLI, this test has limited effectiveness. Use HTTP-based tests for comprehensive validation.

```bash
php backend/test_cors.php
```

### Method 2: Manual curl Tests (RECOMMENDED)

Use the provided batch script for Windows:

```bash
backend/test_cors.bat
```

Or run individual curl commands:

#### Test 1: Allowed Origin (GET)
```bash
curl -i -H "Origin: http://localhost:5173" http://localhost/backend/api/cors_test.php
```

**Expected:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

#### Test 2: Disallowed Origin (GET)
```bash
curl -i -H "Origin: https://evil.com" http://localhost/backend/api/cors_test.php
```

**Expected:**
```
HTTP/1.1 200 OK
(NO Access-Control-Allow-Origin header)
```

#### Test 3: Allowed Origin (OPTIONS Preflight)
```bash
curl -i -X OPTIONS -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" http://localhost/backend/api/cors_test.php
```

**Expected:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Content-Length: 0
```

#### Test 4: Disallowed Origin (OPTIONS Preflight) 🔴 CRITICAL TEST
```bash
curl -i -X OPTIONS -H "Origin: https://evil.com" -H "Access-Control-Request-Method: POST" http://localhost/backend/api/cors_test.php
```

**Expected:**
```
HTTP/1.1 403 Forbidden
Content-Type: application/json
(NO Access-Control-Allow-Origin header)

{"success":false,"error":"Origin not allowed"}
```

#### Test 5: POST with Allowed Origin
```bash
curl -i -X POST -H "Origin: http://localhost:5173" -H "Content-Type: application/json" -d '{}' http://localhost/backend/api/cors_test.php
```

**Expected:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

#### Test 6: POST with Disallowed Origin
```bash
curl -i -X POST -H "Origin: https://hacker.com" -H "Content-Type: application/json" -d '{}' http://localhost/backend/api/cors_test.php
```

**Expected:**
```
HTTP/1.1 200 OK
(NO Access-Control-Allow-Origin header)
```

### Method 3: Browser-Based Testing

Open in browser:
```
http://localhost/backend/test_cors_manual.html
```

This provides an interactive UI for testing CORS but has limitations due to browser security restrictions on setting custom Origin headers.

### Method 4: Postman/Insomnia

Use REST client tools to set custom Origin headers and verify responses:

1. Create request to `http://localhost/backend/api/cors_test.php`
2. Add header: `Origin: http://localhost:5173` (or any origin you want to test)
3. Check response headers for `Access-Control-Allow-Origin`

## 🎯 Test Checklist

Use this checklist to verify your CORS implementation:

- [ ] **Test 1:** GET request with allowed origin → Returns `Access-Control-Allow-Origin: <allowed-origin>`
- [ ] **Test 2:** GET request with disallowed origin → NO `Access-Control-Allow-Origin` header
- [ ] **Test 3:** POST request with allowed origin → Returns `Access-Control-Allow-Origin: <allowed-origin>`
- [ ] **Test 4:** POST request with disallowed origin → NO `Access-Control-Allow-Origin` header
- [ ] **Test 5:** OPTIONS preflight with allowed origin → 200 OK + CORS headers
- [ ] **Test 6:** OPTIONS preflight with disallowed origin → **403 Forbidden** + NO CORS headers
- [ ] **Test 7:** Verify multiple allowed origins work correctly
- [ ] **Test 8:** Verify wildcard (*) is NEVER used with credentials
- [ ] **Test 9:** Request with no Origin header → No CORS headers (normal operation)

## 🔐 Security Best Practices

### ✅ DO:
- Keep `ALLOWED_ORIGINS` as restrictive as possible
- Only add origins you own and trust
- Use HTTPS origins in production
- Include the protocol (http:// or https://) in origin URLs
- Include the port if non-standard (e.g., :5173)
- Review allowed origins regularly

### ❌ DON'T:
- Never use wildcard (`*`) with `Access-Control-Allow-Credentials: true`
- Never add untrusted third-party origins
- Don't fall back to a default origin if the request origin doesn't match
- Don't allow origins based on regex patterns or subdomain wildcards
- Don't disable CORS checks in production

## 🚀 Production Deployment

When deploying to production:

1. **Update `.env`** with production frontend URL:
   ```env
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

2. **Remove development origins** (localhost) from production `.env`

3. **Use HTTPS** for all origins in production

4. **Test thoroughly** using curl or browser DevTools:
   - Verify only your production domain(s) are allowed
   - Verify all other origins return 403 on preflight

5. **Monitor logs** for suspicious CORS-related errors

## 📊 Implementation Details

### Architecture

```
Request → backend/config/database.php 
       → backend/config/cors.php 
       → handleCORS()
       → [Check origin allowlist]
       → [Set headers or reject]
       → Continue to endpoint logic
```

### Flow Diagram

```
                                    ┌─────────────────┐
                                    │ HTTP Request    │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ Load database.php│
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ Load cors.php   │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ handleCORS()    │
                                    └────────┬────────┘
                                             │
                                             ▼
                              ┌──────────────┴──────────────┐
                              │                             │
                              ▼                             ▼
                    ┌──────────────────┐        ┌──────────────────┐
                    │ Origin in        │        │ Origin NOT in    │
                    │ allowlist?       │        │ allowlist?       │
                    └────────┬─────────┘        └────────┬─────────┘
                             │                            │
                    ┌────────┴────────┐                   │
                    │                 │                   │
                    ▼                 ▼                   ▼
         ┌─────────────────┐ ┌──────────────┐  ┌──────────────────┐
         │ Regular Request │ │   OPTIONS    │  │   OPTIONS        │
         │ (GET/POST/etc.) │ │  (Preflight) │  │  (Preflight)     │
         └────────┬────────┘ └──────┬───────┘  └────────┬─────────┘
                  │                 │                    │
                  ▼                 ▼                    ▼
         ┌─────────────────┐ ┌──────────────┐  ┌──────────────────┐
         │ Set CORS headers│ │ Set CORS     │  │ Return 403       │
         │ Continue to     │ │ Return 200   │  │ No CORS headers  │
         │ endpoint logic  │ │ Exit early   │  │ Exit early       │
         └─────────────────┘ └──────────────┘  └──────────────────┘
```

### Files Modified/Created

- ✏️ `backend/config/cors.php` - Core CORS implementation
- ✏️ `backend/.env` - Updated ALLOWED_ORIGINS variable
- ✏️ `backend/.env.example` - Example configuration (already had ALLOWED_ORIGINS)
- ➕ `backend/test_cors.php` - Automated test suite
- ➕ `backend/test_cors.bat` - Windows curl test script
- ➕ `backend/test_cors_manual.html` - Interactive browser test tool
- ➕ `backend/api/cors_test.php` - Simple test endpoint
- ➕ `backend/CORS_README.md` - This documentation

## 🐛 Troubleshooting

### Issue: "Origin not allowed" error on valid requests

**Solution:** Verify the origin is in `ALLOWED_ORIGINS` in `.env`:
```bash
cat backend/.env | grep ALLOWED_ORIGINS
```

### Issue: CORS works in dev but not production

**Solution:** Check that production domain is in `ALLOWED_ORIGINS`:
```env
# Add your production domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Issue: Preflight always returns 200, even for bad origins

**Solution:** Check that `handleCORS()` is being called before any output. It should be in `config/database.php` which is included first.

### Issue: Browser shows "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution:** This is expected for disallowed origins! Check that your frontend origin is in `ALLOWED_ORIGINS`.

## 📚 References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP: CORS Security](https://owasp.org/www-community/attacks/CSRF)
- [W3C: CORS Specification](https://www.w3.org/TR/cors/)

## ✅ Security Audit Checklist

- [x] Read allowed origins from environment variable (`ALLOWED_ORIGINS`)
- [x] Support comma-separated origin list
- [x] Return 403 for disallowed preflight requests
- [x] Never use wildcard (*) with credentials
- [x] Only set CORS headers for allowed origins
- [x] Handle OPTIONS preflight correctly
- [x] Exit early for preflight requests
- [x] Automated tests created
- [x] Manual test scripts provided
- [x] Documentation complete

---

**Last Updated:** 2026-02-11  
**Version:** 1.0  
**Security Review:** ✅ Passed
