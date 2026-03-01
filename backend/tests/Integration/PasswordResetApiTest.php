<?php

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;

class PasswordResetApiTest extends TestCase
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

    public function testForgotPasswordInvalidEmail()
    {
        $response = $this->postRequest('forgot_password.php', [
            'email' => 'doesnotexist@college.edu'
        ]);

        // The API might return 200 even for invalid mail to prevent user enumeration
        // or 404/400. 
        $this->assertContains($response['status'], [200, 400, 404]);
    }

    public function testVerifyOtpInvalid()
    {
        $response = $this->postRequest('verify_otp.php', [
            'email' => 'admin@college.edu',
            'otp' => '000000'
        ]);

        $this->assertEquals(400, $response['status']);
    }
}
