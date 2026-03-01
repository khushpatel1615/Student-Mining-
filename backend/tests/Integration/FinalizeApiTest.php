<?php

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;

class FinalizeApiTest extends TestCase
{
    private string $baseUrl;
    private string $teacherToken;
    private string $studentToken;

    protected function setUp(): void
    {
        $this->baseUrl = getenv('TEST_BASE_URL') ?: 'http://localhost/backend/api/';

        require_once __DIR__ . '/../../includes/jwt.php';
        $this->teacherToken = generateToken(2, 'teacher@college.edu', 'teacher', 'Teacher');
        $this->studentToken = generateToken(3, 'student@college.edu', 'student', 'Student');
    }

    private function request(string $method, string $endpoint, ?string $token = null, array $data = []): array
    {
        $url = rtrim($this->baseUrl, '/') . '/' . ltrim($endpoint, '/');

        $headers = "Content-Type: application/json\r\n";
        if ($token) {
            $headers .= "Authorization: Bearer $token\r\n";
        }

        $options = [
            'http' => [
                'header' => $headers,
                'method' => $method,
                'content' => in_array($method, ['POST', 'PUT', 'DELETE']) && !empty($data) ? json_encode($data) : null,
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

    public function testGetFinalizeStatus()
    {
        $response = $this->request('GET', 'finalize.php?subject_id=1', $this->studentToken);
        $this->assertEquals(200, $response['status']);
    }

    public function testStudentCannotFinalize()
    {
        $response = $this->request('POST', 'finalize.php', $this->studentToken, [
            'subject_id' => 1
        ]);
        $this->assertEquals(403, $response['status']);
    }
}
