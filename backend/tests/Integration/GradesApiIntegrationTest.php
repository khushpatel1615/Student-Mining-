<?php
/**
 * GradesApiTest.php
 * Integration tests for backend/api/grades.php HTTP endpoints.
 * Requires: test DB seeded with test_seed.sql, dev server running on TEST_BASE_URL.
 * RUN: vendor/bin/phpunit tests/Integration/GradesApiTest.php
 */

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;

class GradesApiIntegrationTest extends TestCase
{
    private Client $client;
    private string $baseUrl;

    // Tokens — replace with real JWTs generated from your test seed users
    private string $adminToken;
    private string $teacherToken;
    private string $studentToken;
    private string $expiredToken;

    protected function setUp(): void
    {
        $this->baseUrl = getenv('TEST_BASE_URL') ?: 'http://localhost/student_data_mining/backend/api';

        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'http_errors' => false, // Don't throw on 4xx/5xx — we assert manually
            'headers' => ['Accept' => 'application/json'],
        ]);

        // These must match users in your test_seed.sql
        $this->adminToken = getenv('TEST_ADMIN_TOKEN') ?: 'REPLACE_WITH_SEEDED_ADMIN_JWT';
        $this->teacherToken = getenv('TEST_TEACHER_TOKEN') ?: 'REPLACE_WITH_SEEDED_TEACHER_JWT';
        $this->studentToken = getenv('TEST_STUDENT_TOKEN') ?: 'REPLACE_WITH_SEEDED_STUDENT_JWT';
        $this->expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsInJvbGUiOiJhZG1pbiIsImV4cCI6MX0.EXPIRED';
    }

    // =========================================================
    // AUTH GUARD TESTS
    // =========================================================

    public function testGet_NoToken_Returns401(): void
    {
        // [Grades API GET] - no Authorization header - returns 401
        $response = $this->client->get('grades.php');

        $this->assertSame(401, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);
        $this->assertArrayHasKey('error', $body);
    }

    public function testGet_ExpiredToken_Returns401(): void
    {
        // [Grades API GET] - expired JWT - returns 401
        $response = $this->client->get('grades.php', [
            'headers' => ['Authorization' => "Bearer {$this->expiredToken}"],
        ]);

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testGet_TamperedToken_Returns401(): void
    {
        // [Grades API GET] - tampered JWT payload - returns 401
        $tampered = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.INVALIDSIG';
        $response = $this->client->get('grades.php', [
            'headers' => ['Authorization' => "Bearer {$tampered}"],
        ]);

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testPut_StudentRole_Returns403(): void
    {
        // [Grades API PUT] - student attempting grade update - returns 403
        $response = $this->client->put('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->studentToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => ['grade_id' => 1, 'marks_obtained' => 90],
        ]);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testPut_TeacherRole_Returns403(): void
    {
        // [Grades API PUT] - teacher attempting grade update - returns 403 (admin only)
        $response = $this->client->put('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->teacherToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => ['grade_id' => 1, 'marks_obtained' => 90],
        ]);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testPost_TeacherRole_Returns403(): void
    {
        // [Grades API POST] - teacher attempting bulk grade entry - returns 403 (admin only)
        $response = $this->client->post('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->teacherToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'subject_id' => 1,
                'component_name' => 'Final Exam',
                'students' => [['user_id' => 3, 'marks' => 80]],
            ],
        ]);

        $this->assertSame(403, $response->getStatusCode());
    }

    // =========================================================
    // STUDENT RBAC ISOLATION
    // =========================================================

    public function testGet_StudentAccessingOtherStudentGrades_Returns403(): void
    {
        // [Grades API GET] - student requesting another student's user_id - returns 403
        // Test seed: student has user_id=3. Requesting user_id=4 (another student).
        $response = $this->client->get('grades.php?user_id=4', [
            'headers' => ['Authorization' => "Bearer {$this->studentToken}"],
        ]);

        $this->assertSame(403, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);
        $this->assertStringContainsStringIgnoringCase('denied', $body['error'] ?? $body['message'] ?? '');
    }

    public function testGet_StudentAccessingOwnGrades_Returns200(): void
    {
        // [Grades API GET] - student requesting their own grades - returns 200
        // Test seed: student has user_id=3
        $response = $this->client->get('grades.php?user_id=3', [
            'headers' => ['Authorization' => "Bearer {$this->studentToken}"],
        ]);

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);
        $this->assertIsArray($body);
    }

    // =========================================================
    // RESPONSE SHAPE TESTS
    // =========================================================

    public function testGet_ByEnrollmentId_Returns200WithCorrectShape(): void
    {
        // [Grades API GET] - admin fetching by enrollment_id=1 - returns correct JSON shape
        $response = $this->client->get('grades.php?enrollment_id=1', [
            'headers' => ['Authorization' => "Bearer {$this->adminToken}"],
        ]);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(
            'application/json',
            explode(';', $response->getHeader('Content-Type')[0])[0]
        );

        $body = json_decode((string) $response->getBody(), true);
        $this->assertArrayHasKey('grades', $body);
        $this->assertArrayHasKey('summary', $body);
        $this->assertArrayHasKey('total_obtained', $body['summary']);
        $this->assertArrayHasKey('total_max', $body['summary']);
        $this->assertArrayHasKey('percentage', $body['summary']);
    }

    public function testGet_BySubjectId_Returns200WithPagination(): void
    {
        // [Grades API GET] - admin fetching by subject_id=1 - returns criteria, enrollments, pagination
        $response = $this->client->get('grades.php?subject_id=1', [
            'headers' => ['Authorization' => "Bearer {$this->adminToken}"],
        ]);

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);

        $this->assertArrayHasKey('criteria', $body);
        $this->assertArrayHasKey('enrollments', $body);
        $this->assertArrayHasKey('pagination', $body);
        $this->assertArrayHasKey('page', $body['pagination']);
        $this->assertArrayHasKey('totalPages', $body['pagination']);
    }

    public function testGet_ByProgramId_Returns200WithSubjects(): void
    {
        // [Grades API GET] - admin fetching by program_id=1 - returns criteria, enrollments, subjects
        $response = $this->client->get('grades.php?program_id=1', [
            'headers' => ['Authorization' => "Bearer {$this->adminToken}"],
        ]);

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);

        $this->assertArrayHasKey('criteria', $body);
        $this->assertArrayHasKey('enrollments', $body);
        $this->assertArrayHasKey('subjects', $body);
    }

    // =========================================================
    // VALIDATION TESTS — PUT
    // =========================================================

    public function testPut_MissingGradeIdAndGradesArray_Returns400(): void
    {
        // [Grades API PUT] - neither grade_id nor grades array provided - returns 400
        $response = $this->client->put('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->adminToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => ['marks_obtained' => 50], // No grade_id or grades array
        ]);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testPut_NegativeMarks_Returns400(): void
    {
        // [Grades API PUT] - marks_obtained is negative - returns 400
        $response = $this->client->put('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->adminToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'grades' => [
                    [
                        'grade_id' => 1,
                        'marks_obtained' => -10,
                        'criteria_id' => 1,
                    ]
                ],
            ],
        ]);

        $this->assertSame(400, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);
        $this->assertStringContainsStringIgnoringCase('negative', $body['error'] ?? $body['message'] ?? '');
    }

    public function testPut_NonNumericMarks_Returns400(): void
    {
        // [Grades API PUT] - marks_obtained is a string - returns 400
        $response = $this->client->put('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->adminToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'grades' => [
                    [
                        'grade_id' => 1,
                        'marks_obtained' => 'eighty',
                        'criteria_id' => 1,
                    ]
                ],
            ],
        ]);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testPut_MarksExceedMax_Returns400(): void
    {
        // [Grades API PUT] - marks exceed max_marks for criteria - returns 400
        // Test seed: criteria_id=1 has max_marks=40
        $response = $this->client->put('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->adminToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'grades' => [
                    [
                        'grade_id' => 1,
                        'criteria_id' => 1,
                        'marks_obtained' => 999, // Way over max
                    ]
                ],
            ],
        ]);

        $this->assertSame(400, $response->getStatusCode());
    }

    // =========================================================
    // VALIDATION TESTS — POST
    // =========================================================

    public function testPost_MissingRequiredFields_Returns400(): void
    {
        // [Grades API POST] - missing subject_id, component_name, or students - returns 400
        $response = $this->client->post('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->adminToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => ['subject_id' => 1], // Missing component_name and students
        ]);

        $this->assertSame(400, $response->getStatusCode());
    }

    // =========================================================
    // GRADE WEIGHT INTEGRITY — CRITICAL
    // =========================================================

    public function testPut_WeightsNotSummingTo100_Returns400(): void
    {
        // CRITICAL
        // [Grades API PUT] - subject with criteria weights != 100% - returns 400
        // Test seed: subject_id=99 is seeded with criteria summing to only 90%
        $response = $this->client->put('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->adminToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'grades' => [
                    [
                        'enrollment_id' => 50, // seeded enrollment in broken-weight subject
                        'criteria_id' => 99, // seeded criteria for subject_id=99
                        'marks_obtained' => 30,
                    ]
                ],
            ],
        ]);

        $this->assertSame(400, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);
        $this->assertStringContainsStringIgnoringCase('100%', $body['error'] ?? $body['message'] ?? '');
    }

    public function testPost_WeightsNotSummingTo100_Returns400(): void
    {
        // CRITICAL
        // [Grades API POST] - bulk entry on subject with bad weight sum - returns 400
        $response = $this->client->post('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->adminToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'subject_id' => 99, // Seeded with bad weight sum
                'component_name' => 'Final Exam',
                'students' => [['user_id' => 3, 'marks' => 30]],
            ],
        ]);

        $this->assertSame(400, $response->getStatusCode());
    }

    // =========================================================
    // HAPPY PATH — NULL GRADE HANDLING IN RESPONSE
    // =========================================================

    public function testGet_StudentWithNoGrades_ReturnsNullPercentage_NotZero(): void
    {
        // CRITICAL
        // [Grades API GET] - newly enrolled student with no marks - percentage must be null in response
        // Test seed: enrollment_id=10 belongs to a student with all NULL grades
        $response = $this->client->get('grades.php?enrollment_id=10', [
            'headers' => ['Authorization' => "Bearer {$this->adminToken}"],
        ]);

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);

        $this->assertNull(
            $body['summary']['percentage'],
            'A student with no grades must return null percentage, not 0.'
        );
    }

    public function testGet_FinalPercentage_NeverExceeds100(): void
    {
        // [Grades API GET] - final_percentage on enrollment response - never exceeds 100
        $response = $this->client->get('grades.php?subject_id=1', [
            'headers' => ['Authorization' => "Bearer {$this->adminToken}"],
        ]);

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);

        foreach ($body['enrollments'] as $enrollment) {
            if ($enrollment['final_percentage'] !== null) {
                $this->assertLessThanOrEqual(
                    100.0,
                    (float) $enrollment['final_percentage'],
                    "Enrollment ID {$enrollment['id']} has final_percentage > 100."
                );
                $this->assertGreaterThanOrEqual(
                    0.0,
                    (float) $enrollment['final_percentage'],
                    "Enrollment ID {$enrollment['id']} has final_percentage < 0."
                );
            }
        }
    }

    // =========================================================
    // RECALCULATE ACTION
    // =========================================================

    public function testPut_RecalculateSubject_MissingSubjectId_Returns400(): void
    {
        // [Grades API PUT] - recalculate_subject action with no subject_id - returns 400
        $response = $this->client->put('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->adminToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => ['action' => 'recalculate_subject'], // Missing subject_id
        ]);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testPut_RecalculateSubject_ValidSubjectId_Returns200(): void
    {
        // [Grades API PUT] - valid recalculate_subject action - returns 200 with success message
        $response = $this->client->put('grades.php', [
            'headers' => [
                'Authorization' => "Bearer {$this->adminToken}",
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'action' => 'recalculate_subject',
                'subject_id' => 1,
            ],
        ]);

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);
        $this->assertArrayHasKey('message', $body);
        $this->assertStringContainsStringIgnoringCase('recalculated', $body['message']);
    }

    // =========================================================
    // METHOD NOT ALLOWED
    // =========================================================

    public function testDelete_Returns405(): void
    {
        // [Grades API] - DELETE method - returns 405 Method Not Allowed
        $response = $this->client->delete('grades.php', [
            'headers' => ['Authorization' => "Bearer {$this->adminToken}"],
        ]);

        $this->assertSame(405, $response->getStatusCode());
    }
}
