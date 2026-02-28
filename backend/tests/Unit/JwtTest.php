<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/jwt.php';
require_once __DIR__ . '/../../config/env.php';

class JwtTest extends TestCase
{
    public function testValidTokenGeneration(): void
    {
        $token = generateToken(1, 'test@test.com', 'admin', 'Test User');
        $this->assertNotEmpty($token, 'Token should be generated');
        $this->assertCount(3, explode('.', $token), 'Token should have 3 parts (header, payload, signature)');
    }

    public function testValidTokenVerification(): void
    {
        $token = generateToken(123, 'user@test.com', 'student', 'John Doe');
        $result = verifyToken($token);

        $this->assertTrue($result['valid'], 'Valid token should verify successfully');
        $this->assertEquals(123, $result['payload']['user_id']);
        $this->assertEquals('user@test.com', $result['payload']['email']);
        $this->assertEquals('student', $result['payload']['role']);
        $this->assertEquals('John Doe', $result['payload']['full_name']);
    }

    public function testExpiredToken(): void
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
        $this->assertFalse($result['valid'], 'Expired token should not be considered valid');
        $this->assertEquals('Token expired', $result['error']);
    }

    public function testInvalidSignature(): void
    {
        $token = generateToken(1, 'test@test.com', 'admin', 'Test');

        // Tamper with the token's payload
        $parts = explode('.', $token);
        $payload = json_decode(base64UrlDecode($parts[1]), true);
        $payload['role'] = 'superadmin';
        $parts[1] = base64UrlEncode(json_encode($payload));
        $tamperedToken = implode('.', $parts);

        $result = verifyToken($tamperedToken);
        $this->assertFalse($result['valid'], 'Tampered token payload must invalidate the signature');
        $this->assertEquals('Invalid signature', $result['error']);

        // Tamper with the token's signature string directly
        $parts = explode('.', $token);
        $parts[2] = 'invalid_signature_tampered';
        $tamperedToken2 = implode('.', $parts);

        $result2 = verifyToken($tamperedToken2);
        $this->assertFalse($result2['valid'], 'Invalid signature string must fail verification');
        $this->assertEquals('Invalid signature', $result2['error']);
    }

    public function testInvalidFormat(): void
    {
        $result = verifyToken('not.a.valid.token.format');
        $this->assertFalse($result['valid'], 'Tokens with more than 3 parts should fail');

        $result2 = verifyToken('invalid');
        $this->assertFalse($result2['valid'], 'Tokens with 1 part should fail');
    }
}
