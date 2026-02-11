<?php

/**
 * JWT Authentication Tests
 * 
 * Run: php backend/tests/JwtTest.php
 */

require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../config/env.php';

class JwtTest
{
    private $testsPassed = 0;
    private $testsFailed = 0;

    public function run()
    {
        echo "=== JWT Authentication Tests ===\n\n";

        $this->testValidTokenGeneration();
        $this->testValidTokenVerification();
        $this->testExpiredToken();
        $this->testInvalidSignature();
        $this->testInvalidFormat();
        $this->testRoleCheck();
        $this->testMultiRoleCheck();

        echo "\n=== Test Results ===\n";
        echo "Passed: {$this->testsPassed}\n";
        echo "Failed: {$this->testsFailed}\n";

        return $this->testsFailed === 0;
    }

    private function testValidTokenGeneration()
    {
        $token = generateToken(1, 'test@test.com', 'admin', 'Test User');
        $this->assertTrue(!empty($token), 'Token should be generated');
        $this->assertTrue(count(explode('.', $token)) === 3, 'Token should have 3 parts');
    }

    private function testValidTokenVerification()
    {
        $token = generateToken(123, 'user@test.com', 'student', 'John Doe');
        $result = verifyToken($token);

        $this->assertTrue($result['valid'], 'Valid token should verify');
        $this->assertEquals($result['payload']['user_id'], 123, 'User ID should match');
        $this->assertEquals($result['payload']['email'], 'user@test.com', 'Email should match');
        $this->assertEquals($result['payload']['role'], 'student', 'Role should match');
        $this->assertEquals($result['payload']['full_name'], 'John Doe', 'Full name should match');
    }

    private function testExpiredToken()
    {
        // Manually create an expired token
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'iss' => 'StudentDataMining',
            'iat' => time() - 10000,
            'exp' => time() - 5000, // Expired 5000 seconds ago
            'user_id' => 1,
            'email' => 'test@test.com',
            'role' => 'admin',
            'full_name' => 'Test'
        ]);

        $base64Header = base64UrlEncode($header);
        $base64Payload = base64UrlEncode($payload);
        $signature = hash_hmac('sha256', $base64Header . '.' . $base64Payload, JWT_SECRET, true);
        $base64Signature = base64UrlEncode($signature);
        $expiredToken = $base64Header . '.' . $base64Payload . '.' . $base64Signature;

        $result = verifyToken($expiredToken);
        $this->assertFalse($result['valid'], 'Expired token should not verify');
        $this->assertEquals($result['error'], 'Token expired', 'Error message should indicate expiration');
    }

    private function testInvalidSignature()
    {
        $token = generateToken(1, 'test@test.com', 'admin', 'Test');
        // Tamper with the token
        $parts = explode('.', $token);
        $parts[2] = 'invalid_signature';
        $tamperedToken = implode('.', $parts);

        $result = verifyToken($tamperedToken);
        $this->assertFalse($result['valid'], 'Tampered token should not verify');
        $this->assertEquals($result['error'], 'Invalid signature', 'Error should indicate invalid signature');
    }

    private function testInvalidFormat()
    {
        $result = verifyToken('not.a.valid.token.format');
        $this->assertFalse($result['valid'], 'Invalid format should not verify');

        $result2 = verifyToken('invalid');
        $this->assertFalse($result2['valid'], 'Single part token should not verify');
    }

    private function testRoleCheck()
    {
        // This test simulates the requireRole middleware
        $payload = [
            'user_id' => 1,
            'role' => 'student',
            'email' => 'student@test.com'
        ];

        // Test single role match
        $allowedRoles = ['student'];
        $this->assertTrue(in_array($payload['role'], $allowedRoles), 'Student should match student role');

        // Test single role mismatch
        $allowedRoles = ['admin'];
        $this->assertFalse(in_array($payload['role'], $allowedRoles), 'Student should not match admin role');
    }

    private function testMultiRoleCheck()
    {
        $payload = [
            'user_id' => 1,
            'role' => 'teacher',
            'email' => 'teacher@test.com'
        ];

        // Test multiple roles
        $allowedRoles = ['admin', 'teacher'];
        $this->assertTrue(in_array($payload['role'], $allowedRoles), 'Teacher should match teacher or admin roles');

        $allowedRoles = ['admin', 'student'];
        $this->assertFalse(in_array($payload['role'], $allowedRoles), 'Teacher should not match admin or student');
    }

    // Test helper methods
    private function assertTrue($condition, $message)
    {
        if ($condition) {
            $this->testsPassed++;
            echo "✓ PASS: $message\n";
        } else {
            $this->testsFailed++;
            echo "✗ FAIL: $message\n";
        }
    }

    private function assertFalse($condition, $message)
    {
        $this->assertTrue(!$condition, $message);
    }

    private function assertEquals($actual, $expected, $message)
    {
        $this->assertTrue($actual === $expected, "$message (expected: $expected, got: $actual)");
    }
}

// Run tests if executed directly
if (php_sapi_name() === 'cli') {
    $test = new JwtTest();
    $success = $test->run();
    exit($success ? 0 : 1);
}
