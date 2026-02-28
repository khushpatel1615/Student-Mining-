<?php

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;

/**
 * Integration Test for the login API endpoint
 */
class AuthApiTest extends TestCase
{
    private $baseUrl;

    protected function setUp(): void
    {
        $this->baseUrl = getenv('TEST_BASE_URL') ?: 'http://localhost/backend/api/';
    }

    /**
     * Helper logic to make HTTP requests
     * We use a basic file_get_contents since not all environments have Guzzle
     */
    private function postRequest(string $endpoint, array $data): array
    {
        $url = rtrim($this->baseUrl, '/') . '/' . ltrim($endpoint, '/');

        $options = [
            'http' => [
                'header' => "Content-Type: application/json\r\n",
                'method' => 'POST',
                'content' => json_encode($data),
                'ignore_errors' => true // to read responses even on 4xx/5xx errors
            ]
        ];

        $context = stream_context_create($options);
        $response = file_get_contents($url, false, $context);

        // Parse HTTP response code
        $status = 0;
        if (isset($http_response_header[0]) && preg_match('#HTTP/\d+\.\d+ (\d+)#', $http_response_header[0], $matches)) {
            $status = (int) $matches[1];
        }

        return [
            'status' => $status,
            'body' => json_decode($response, true)
        ];
    }

    public function testLoginWithValidAdminCredentials()
    {
        // This test requires the database to contain the default admin credentials
        // admin@college.edu / password123 as defined in complete_schema.sql
        $response = $this->postRequest('login.php', [
            'email' => 'admin@college.edu',
            'password' => 'password123'
        ]);

        $this->assertEquals(200, $response['status']);
        $this->assertTrue($response['body']['success'] ?? false);
        $this->assertNotEmpty($response['body']['token']);
        $this->assertEquals('admin', $response['body']['user']['role']);
    }

    public function testLoginWithInvalidPassword()
    {
        $response = $this->postRequest('login.php', [
            'email' => 'admin@college.edu',
            'password' => 'wrongpassword123'
        ]);

        $this->assertEquals(401, $response['status']);
        $this->assertFalse($response['body']['success'] ?? true);
        $this->assertStringContainsString('Invalid email or password', $response['body']['error'] ?? '');
    }

    public function testLoginWithNonExistentEmail()
    {
        $response = $this->postRequest('login.php', [
            'email' => 'nonexistent@example.com',
            'password' => 'anypassword'
        ]);

        $this->assertEquals(401, $response['status']);
        $this->assertFalse($response['body']['success'] ?? true);
    }

    public function testLoginWithEmptyFields()
    {
        $response = $this->postRequest('login.php', [
            'email' => '',
            'password' => ''
        ]);

        $this->assertEquals(400, $response['status'], 'Empty credentials should return 400 Bad Request');
        $this->assertFalse($response['body']['success'] ?? true);
    }

    public function testSqlInjectionAttemptInEmail()
    {
        // Attack payload targeting SQL logic bypass via ' OR '1'='1
        $response = $this->postRequest('login.php', [
            'email' => "admin@college.edu' OR '1'='1",
            'password' => 'password123'
        ]);

        $this->assertEquals(401, $response['status']);
        $this->assertFalse($response['body']['success'] ?? true);
    }
}
