<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/error_handler.php';

class ErrorHandlerTest extends TestCase
{
    public function testGetRequestIdGeneratesUniqueId()
    {
        $id1 = getRequestId();
        $this->assertNotEmpty($id1);
        $this->assertEquals(32, strlen($id1)); // bin2hex of 16 bytes = 32 chars
    }

    public function testGetRequestDuration()
    {
        $duration = getRequestDuration();
        $this->assertIsFloat($duration);
        $this->assertGreaterThanOrEqual(0, $duration);
    }

    public function testStructuredLogDoesNotCrash()
    {
        // Create a temporary log file to ensure it works
        $logDir = __DIR__ . '/../../logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        logInfo('Test info log', ['user' => 1]);
        logWarning('Test warning log');
        logError('Test error log');

        $logFile = $logDir . '/app-' . date('Y-m-d') . '.log';
        $this->assertFileExists($logFile);

        $contents = file_get_contents($logFile);
        $this->assertStringContainsString('Test info log', $contents);
    }
}
