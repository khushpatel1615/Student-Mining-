# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly by emailing [your-email@example.com].

## Security Best Practices Implemented

### Authentication
- **JWT-based authentication** with secure token handling
- **Password hashing** using PHP's `password_hash()` with BCRYPT
- **Google OAuth 2.0** integration for secure third-party authentication

### Data Protection
- **Prepared statements** for all database queries to prevent SQL injection
- **Input validation** on both client and server sides
- **Role-based access control** (Admin, Teacher, Student)

### Configuration
- Sensitive credentials are stored in `backend/config/database.php` which is excluded from version control
- API keys and secrets are not hardcoded in the public repository

## Setup Instructions

1. Copy `backend/config/database.example.php` to `backend/config/database.php`
2. Update the following values with your own credentials:
   - `DB_USER` - Your MySQL username
   - `DB_PASS` - Your MySQL password
   - `JWT_SECRET` - Generate a secure random string (min 32 characters)
   - `GOOGLE_CLIENT_ID` - From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

### Generating a Secure JWT Secret

You can generate a secure JWT secret using:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using PHP
php -r "echo bin2hex(random_bytes(32));"
```

## Known Considerations

- This project is for **educational/portfolio purposes**
- Before deploying to production, conduct a thorough security audit
- Ensure HTTPS is enabled in production environments
- Regularly update dependencies to patch security vulnerabilities
