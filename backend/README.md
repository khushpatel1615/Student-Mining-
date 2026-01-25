# Student Data Mining Backend

## Structure
- `/api` - API Endpoints (Auth, Students, Analytics, etc.)
- `/config` - Database, Env, CORS configuration
- `/includes` - Shared helpers (JWT, API Helpers)
- `/debug` - Debugging scripts (Do not deploy to production)
- `/data` - Static CSV data
- `/uploads` - User uploaded files

## Setup
1. Copy `.env.example` to `.env` and fill in credentials.
2. Run database migrations: `php database/migrations/run_migrations.php`
3. Ensure `/uploads` is writable.

## API Standards
- All endpoints must include `config/database.php`.
- Use `requireMethod('POST')` etc.
- Use `sendResponse($data)` or `sendError($msg)`.
- Use `requireAuth()` or `requireRole('admin')` for protected routes.
- **Never** commit secrets or `.env` files.
