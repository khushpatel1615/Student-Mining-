<?php
/**
 * Google OAuth API Endpoint
 * POST /api/google-auth.php
 * Handles Google Sign-In authentication
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

// Get JSON input
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!$input) {
    jsonResponse(['success' => false, 'error' => 'Invalid JSON input'], 400);
}

$credential = $input['credential'] ?? '';

if (empty($credential)) {
    jsonResponse(['success' => false, 'error' => 'Google credential is required'], 400);
}

try {
    // Verify Google ID token
    $googleUser = verifyGoogleToken($credential);

    if (!$googleUser) {
        jsonResponse(['success' => false, 'error' => 'Invalid Google credential'], 401);
    }

    $pdo = getDBConnection();

    // Check if user exists by Google ID or email
    $stmt = $pdo->prepare("
        SELECT id, email, student_id, full_name, role, avatar_url, google_id, password_hash, current_semester 
        FROM users 
        WHERE (google_id = :google_id OR email = :email) AND is_active = 1
    ");
    $stmt->execute([
        'google_id' => $googleUser['sub'],
        'email' => $googleUser['email']
    ]);
    $user = $stmt->fetch();

    if (!$user) {
        // User not registered in the system
        jsonResponse([
            'success' => false,
            'error' => 'Account not registered. Please contact your administrator to register your email: ' . $googleUser['email']
        ], 401);
    }

    // Update user's Google ID and avatar if not set
    if (empty($user['google_id']) || empty($user['avatar_url'])) {
        $updateStmt = $pdo->prepare("
            UPDATE users 
            SET google_id = :google_id, 
                avatar_url = COALESCE(avatar_url, :avatar_url),
                last_login = NOW()
            WHERE id = :id
        ");
        $updateStmt->execute([
            'google_id' => $googleUser['sub'],
            'avatar_url' => $googleUser['picture'] ?? null,
            'id' => $user['id']
        ]);
        $user['avatar_url'] = $user['avatar_url'] ?? $googleUser['picture'];
    } else {
        // Just update last login
        $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
        $updateStmt->execute(['id' => $user['id']]);
    }

    // Generate JWT token
    $token = generateToken($user['id'], $user['email'], $user['role'], $user['full_name']);

    // Return success response
    jsonResponse([
        'success' => true,
        'message' => 'Google authentication successful',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'student_id' => $user['student_id'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'avatar_url' => $user['avatar_url'] ?? $googleUser['picture'],
            'current_semester' => $user['current_semester'],
            'hasPassword' => !empty($user['password_hash'])
        ]
    ]);

} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Authentication error occurred'], 500);
}

/**
 * Verify Google Token (ID Token or Access Token)
 */
function verifyGoogleToken($token)
{
    // 1. Try as ID Token (JWT)
    $parts = explode('.', $token);
    if (count($parts) === 3) {
        // Decode payload
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        if ($payload) {

            // Verify with Google
            $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($token);
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $googlePayload = json_decode($response, true);
                if ($googlePayload && !isset($googlePayload['error'])) {
                    if ($googlePayload['aud'] === GOOGLE_CLIENT_ID) {
                        return $googlePayload;
                    }
                }
            }
        }
    }

    // 2. Try as Access Token (Opaque)
    // Call UserInfo endpoint
    $url = 'https://www.googleapis.com/oauth2/v3/userinfo';
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $token]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $userPayload = json_decode($response, true);
        if ($userPayload && isset($userPayload['sub'])) {
            return $userPayload; // UserInfo response has 'sub', 'email', 'picture' etc.
        }
    }

    // 3. Fallback: verification failed
    return null;
}
?>