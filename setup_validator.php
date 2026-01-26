#!/usr/bin/env php
<?php
/**
 * Setup Validation Script
 * Checks if the StudentDataMining system is correctly configured
 * 
 * Usage: php setup_validator.php
 */

echo "==============================================\n";
echo "  StudentDataMining - Setup Validator\n";
echo "==============================================\n\n";

$errors = [];
$warnings = [];
$successes = [];

// ============================================
// 1. Check PHP Version
// ============================================
echo "[1/10] Checking PHP version...\n";
$phpVersion = phpversion();
if (version_compare($phpVersion, '8.1.0', '>=')) {
    $successes[] = "✅ PHP version: $phpVersion (>= 8.1.0)";
} else {
    $errors[] = "❌ PHP version: $phpVersion (requires >= 8.1.0)";
}

// ============================================
// 2. Check Required PHP Extensions
// ============================================
echo "[2/10] Checking PHP extensions...\n";
$requiredExtensions = ['pdo', 'pdo_mysql', 'json', 'mbstring', 'openssl'];
foreach ($requiredExtensions as $ext) {
    if (extension_loaded($ext)) {
        $successes[] = "✅ PHP extension: $ext";
    } else {
        $errors[] = "❌ Missing PHP extension: $ext";
    }
}

// ============================================
// 3. Check Backend .env File
// ============================================
echo "[3/10] Checking backend .env file...\n";
$backendEnvPath = __DIR__ . '/backend/.env';
if (file_exists($backendEnvPath)) {
    $successes[] = "✅ backend/.env exists";

    // Read .env and check for required variables
    $envContent = file_get_contents($backendEnvPath);
    $requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];

    foreach ($requiredVars as $var) {
        if (strpos($envContent, "$var=") !== false) {
            // Check if JWT_SECRET is still the default placeholder
            if ($var === 'JWT_SECRET' && strpos($envContent, 'CHANGE_THIS') !== false) {
                $warnings[] = "⚠️  JWT_SECRET is still the default value - CHANGE for production!";
            } else {
                $successes[] = "✅ $var is configured";
            }
        } else {
            $errors[] = "❌ Missing $var in backend/.env";
        }
    }
} else {
    $errors[] = "❌ backend/.env not found (copy from backend/.env.example)";
}

// ============================================
// 4. Check Frontend .env File
// ============================================
echo "[4/10] Checking frontend .env file...\n";
$frontendEnvPath = __DIR__ . '/frontend/.env';
if (file_exists($frontendEnvPath)) {
    $successes[] = "✅ frontend/.env exists";

    $envContent = file_get_contents($frontendEnvPath);
    if (strpos($envContent, 'VITE_API_BASE_URL=') !== false) {
        $successes[] = "✅ VITE_API_BASE_URL is configured";
    } else {
        $errors[] = "❌ Missing VITE_API_BASE_URL in frontend/.env";
    }
} else {
    $warnings[] = "⚠️  frontend/.env not found (copy from frontend/.env.example)";
}

// ============================================
// 5. Check Database Connection
// ============================================
echo "[5/10] Checking database connection...\n";
if (file_exists($backendEnvPath)) {
    require_once __DIR__ . '/backend/config/EnvLoader.php';
    EnvLoader::load($backendEnvPath);

    $dbHost = getenv('DB_HOST') ?: 'localhost';
    $dbName = getenv('DB_NAME') ?: 'student_data_mining';
    $dbUser = getenv('DB_USER') ?: 'root';
    $dbPass = getenv('DB_PASS') ?: '';

    try {
        $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
        $pdo = new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        $successes[] = "✅ Database connection successful";

        // Check if tables exist
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $tableCount = count($tables);

        if ($tableCount >= 15) {
            $successes[] = "✅ Database has $tableCount tables (schema imported)";
        } elseif ($tableCount > 0) {
            $warnings[] = "⚠️  Database has only $tableCount tables (expected 20+). Run migrations?";
        } else {
            $errors[] = "❌ Database is empty. Import database/complete_schema.sql";
        }

        // Check for critical tables
        $criticalTables = ['users', 'subjects', 'student_enrollments', 'assignments'];
        foreach ($criticalTables as $table) {
            if (in_array($table, $tables)) {
                $successes[] = "✅ Table '$table' exists";
            } else {
                $errors[] = "❌ Missing table '$table'";
            }
        }

        // Check for default users
        $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
        $adminCount = $stmt->fetchColumn();
        if ($adminCount > 0) {
            $successes[] = "✅ Admin user exists";
        } else {
            $warnings[] = "⚠️  No admin users found. Create one or import sample data.";
        }

    } catch (PDOException $e) {
        $errors[] = "❌ Database connection failed: " . $e->getMessage();
    }
} else {
    $errors[] = "❌ Cannot check database (backend/.env missing)";
}

// ============================================
// 6. Check Frontend Dependencies
// ============================================
echo "[6/10] Checking frontend dependencies...\n";
$frontendNodeModules = __DIR__ . '/frontend/node_modules';
if (is_dir($frontendNodeModules)) {
    $successes[] = "✅ Frontend node_modules installed";
} else {
    $errors[] = "❌ Frontend dependencies not installed. Run 'cd frontend && npm install'";
}

$frontendPackageJson = __DIR__ . '/frontend/package.json';
if (file_exists($frontendPackageJson)) {
    $successes[] = "✅ frontend/package.json exists";
} else {
    $errors[] = "❌ frontend/package.json missing";
}

// ============================================
// 7. Check Directory Permissions
// ============================================
echo "[7/10] Checking directory permissions...\n";
$uploadsDir = __DIR__ . '/backend/uploads';
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
    $successes[] = "✅ Created backend/uploads directory";
} else {
    $successes[] = "✅ backend/uploads exists";
}

if (is_writable($uploadsDir)) {
    $successes[] = "✅ backend/uploads is writable";
} else {
    $errors[] = "❌ backend/uploads is not writable. Fix permissions: chmod 755 backend/uploads";
}

// ============================================
// 8. Check Critical Files
// ============================================
echo "[8/10] Checking critical files...\n";
$criticalFiles = [
    'database/complete_schema.sql',
    'database/migrations/run_migrations.php',
    'backend/config/database.php',
    'backend/config/cors.php',
    'backend/api/login.php',
    'frontend/src/main.jsx',
    'frontend/index.html',
    'frontend/vite.config.js'
];

foreach ($criticalFiles as $file) {
    $filePath = __DIR__ . '/' . $file;
    if (file_exists($filePath)) {
        $successes[] = "✅ $file exists";
    } else {
        $errors[] = "❌ Missing critical file: $file";
    }
}

// ============================================
// 9. Check .gitignore
// ============================================
echo "[9/10] Checking .gitignore...\n";
$gitignorePath = __DIR__ . '/.gitignore';
if (file_exists($gitignorePath)) {
    $gitignoreContent = file_get_contents($gitignorePath);
    if (
        strpos($gitignoreContent, 'node_modules') !== false &&
        strpos($gitignoreContent, '.env') !== false
    ) {
        $successes[] = "✅ .gitignore configured correctly";
    } else {
        $warnings[] = "⚠️  .gitignore might be incomplete";
    }
} else {
    $warnings[] = "⚠️  .gitignore not found";
}

// ============================================
// 10. Security Checks
// ============================================
echo "[10/10] Running security checks...\n";

// Check if .env files are in .gitignore
if (file_exists($gitignorePath)) {
    $gitignoreContent = file_get_contents($gitignorePath);
    if (strpos($gitignoreContent, '.env') !== false) {
        $successes[] = "✅ .env files excluded from git";
    } else {
        $errors[] = "❌ .env files NOT in .gitignore - SECURITY RISK!";
    }
}

// Check if JWT_SECRET is secure
if (file_exists($backendEnvPath)) {
    $envContent = file_get_contents($backendEnvPath);
    preg_match('/JWT_SECRET=(.*)/', $envContent, $matches);
    if (isset($matches[1])) {
        $jwtSecret = trim($matches[1]);
        if (strlen($jwtSecret) < 32) {
            $warnings[] = "⚠️  JWT_SECRET is too short (< 32 chars). Generate a stronger secret!";
        } elseif (strpos($jwtSecret, 'CHANGE') !== false || strpos($jwtSecret, 'secret') !== false) {
            $warnings[] = "⚠️  JWT_SECRET looks like a default value. Change it!";
        }
    }
}

// ============================================
// FINAL REPORT
// ============================================
echo "\n";
echo "==============================================\n";
echo "  VALIDATION REPORT\n";
echo "==============================================\n\n";

if (count($successes) > 0) {
    echo "✅ SUCCESSES (" . count($successes) . "):\n";
    foreach ($successes as $success) {
        echo "   $success\n";
    }
    echo "\n";
}

if (count($warnings) > 0) {
    echo "⚠️  WARNINGS (" . count($warnings) . "):\n";
    foreach ($warnings as $warning) {
        echo "   $warning\n";
    }
    echo "\n";
}

if (count($errors) > 0) {
    echo "❌ ERRORS (" . count($errors) . "):\n";
    foreach ($errors as $error) {
        echo "   $error\n";
    }
    echo "\n";
}

// ============================================
// VERDICT
// ============================================
echo "==============================================\n";
if (count($errors) === 0) {
    if (count($warnings) === 0) {
        echo "✅ ALL CHECKS PASSED! System is ready to run.\n";
        echo "\nNext steps:\n";
        echo "  1. cd frontend\n";
        echo "  2. npm run dev\n";
        echo "  3. Open http://localhost:5173\n";
        exit(0);
    } else {
        echo "⚠️  SETUP IS FUNCTIONAL but has warnings.\n";
        echo "   Review warnings above before deploying to production.\n";
        exit(0);
    }
} else {
    echo "❌ SETUP IS INCOMPLETE. Fix errors above.\n";
    echo "\nCommon fixes:\n";
    echo "  • cp backend/.env.example backend/.env\n";
    echo "  • cp frontend/.env.example frontend/.env\n";
    echo "  • mysql -u root -p student_data_mining < database/complete_schema.sql\n";
    echo "  • cd frontend && npm install\n";
    exit(1);
}
?>