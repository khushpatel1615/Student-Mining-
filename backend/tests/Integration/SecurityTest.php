<?php

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;

class SecurityTest extends TestCase
{
    private string $baseUrl;

    protected function setUp(): void
    {
        $this->baseUrl = getenv('TEST_BASE_URL') ?: 'http://localhost/backend/api/';
    }

    private function postRequest(string $endpoint, array $data): array
    {
        $url = rtrim($this->baseUrl, '/') . '/' . ltrim($endpoint, '/');

        $options = [
            'http' => [
                'header' => "Content-Type: application/json\r\n",
                'method' => 'POST',
                'content' => json_encode($data),
                'ignore_errors' => true
            ]
        ];

        $context = stream_context_create($options);
        $response = file_get_contents($url, false, $context);

        $status = 0;
        if (isset($http_response_header[0]) && preg_match('#HTTP/\d+\.\d+ (\d+)#', $http_response_header[0], $matches)) {
            $status = (int) $matches[1];
        }

        return [
            'status' => $status,
            'body' => json_decode($response, true)
        ];
    }

    public function testSqlInjectionInLogin()
    {
        $response = $this->postRequest('login.php', [
            'email' => "admin@college.edu' OR '1'='1",
            'password' => 'password123'
        ]);

        $this->assertEquals(401, $response['status']);
        $this->assertFalse($response['body']['success'] ?? true);
    }

    public function testXssPayloadHandling()
    {
        $response = $this->postRequest('login.php', [
            'email' => "<script>alert(1)</script>admin@college.edu",
            'password' => 'password123'
        ]);

        $this->assertEquals(401, $response['status']);
    }
}
