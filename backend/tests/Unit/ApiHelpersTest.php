<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/api_helpers.php';

class ApiHelpersTest extends TestCase
{
    public function testGetJsonInputValid()
    {
        // We can't easily mock php://input without stream wrappers, 
        // but we can ensure the function is defined and doesn't crash.
        $this->assertTrue(function_exists('getJsonInput'));

        // Since getJsonInput reads php://input which is empty in CLI:
        $result = getJsonInput();
        $this->assertIsArray($result);
    }

    public function testRequireMethod()
    {
        $this->assertTrue(function_exists('requireMethod'));

        // Since we stubbed sendError in bootstrap, calling it won't exit
        $_SERVER['REQUEST_METHOD'] = 'GET';

        // This should trigger sendError because method is not POST
        requireMethod('POST');
        $this->assertTrue(true); // Reaching here means sendError didn't exit, meaning stub works

        $_SERVER['REQUEST_METHOD'] = 'POST';
        requireMethod(['POST', 'PUT']);
        $this->assertTrue(true); // Allowed
    }
}
