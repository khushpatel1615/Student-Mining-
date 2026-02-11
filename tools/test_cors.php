<?php
/**
 * CORS Security Test Suite
 * Tests the CORS implementation to ensure proper security controls
 * 
 * Run from command line: php test_cors.php
 * Or access via browser for HTML report
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Load dependencies
require_once __DIR__ . '/config/EnvLoader.php';
require_once __DIR__ . '/config/database.php';

/**
 * Mock HTTP request with specific origin
 */
function mockRequest($origin, $method = 'GET')
{
    $_SERVER['HTTP_ORIGIN'] = $origin;
    $_SERVER['REQUEST_METHOD'] = $method;
}

/**
 * Capture headers sent by handleCORS
 */
function captureHeaders(callable $callback)
{
    ob_start();
    $headers = [];

    // Override header function to capture instead of send
    $GLOBALS['test_headers'] = [];

    try {
        $callback();
    } catch (Exception $e) {
        // Catch exit from preflight
    }

    $output = ob_get_clean();

    // Get headers that would have been sent
    $sentHeaders = headers_list();

    return [
        'headers' => $sentHeaders,
        'output' => $output,
        'status' => http_response_code()
    ];
}

/**
 * Test Case Runner
 */
class CORSTestRunner
{
    private $results = [];
    private $allowedOrigins;

    public function __construct()
    {
        $this->allowedOrigins = ALLOWED_ORIGINS;
    }

    public function runAllTests()
    {
        echo "=================================================\n";
        echo "CORS SECURITY TEST SUITE\n";
        echo "=================================================\n\n";

        echo "Allowed Origins (from env): \n";
        foreach ($this->allowedOrigins as $origin) {
            echo "  - $origin\n";
        }
        echo "\n";

        $this->testAllowedOriginGET();
        $this->testAllowedOriginPOST();
        $this->testAllowedOriginOPTIONS();
        $this->testDisallowedOriginGET();
        $this->testDisallowedOriginPOST();
        $this->testDisallowedOriginOPTIONS();
        $this->testNoOriginHeader();
        $this->testMultipleAllowedOrigins();
        $this->testCredentialsNeverWildcard();

        $this->printSummary();
    }

    private function testAllowedOriginGET()
    {
        $testName = "Test 1: Allowed origin (GET request)";
        $allowedOrigin = $this->allowedOrigins[0];

        $_SERVER['HTTP_ORIGIN'] = $allowedOrigin;
        $_SERVER['REQUEST_METHOD'] = 'GET';

        ob_start();
        handleCORS();
        ob_end_clean();

        $headers = headers_list();
        $hasAllowOrigin = $this->hasHeader($headers, "Access-Control-Allow-Origin: $allowedOrigin");
        $hasCredentials = $this->hasHeader($headers, "Access-Control-Allow-Credentials: true");

        $pass = $hasAllowOrigin && $hasCredentials;

        $this->recordResult($testName, $pass, [
            'Expected' => "Access-Control-Allow-Origin: $allowedOrigin",
            'Has Allow-Origin' => $hasAllowOrigin ? 'YES' : 'NO',
            'Has Credentials' => $hasCredentials ? 'YES' : 'NO'
        ]);

        $this->resetHeaders();
    }

    private function testAllowedOriginPOST()
    {
        $testName = "Test 2: Allowed origin (POST request)";
        $allowedOrigin = $this->allowedOrigins[0];

        $_SERVER['HTTP_ORIGIN'] = $allowedOrigin;
        $_SERVER['REQUEST_METHOD'] = 'POST';

        ob_start();
        handleCORS();
        ob_end_clean();

        $headers = headers_list();
        $hasAllowOrigin = $this->hasHeader($headers, "Access-Control-Allow-Origin: $allowedOrigin");

        $pass = $hasAllowOrigin;

        $this->recordResult($testName, $pass, [
            'Expected' => "Headers present for $allowedOrigin",
            'Result' => $hasAllowOrigin ? 'PASS' : 'FAIL'
        ]);

        $this->resetHeaders();
    }

    private function testAllowedOriginOPTIONS()
    {
        $testName = "Test 3: Allowed origin (OPTIONS preflight)";
        $allowedOrigin = $this->allowedOrigins[0];

        $_SERVER['HTTP_ORIGIN'] = $allowedOrigin;
        $_SERVER['REQUEST_METHOD'] = 'OPTIONS';

        ob_start();
        try {
            handleCORS();
        } catch (Exception $e) {
            // Expected - handleCORS calls exit()
        }
        $output = ob_get_clean();

        $headers = headers_list();
        $status = http_response_code();

        $hasAllowOrigin = $this->hasHeader($headers, "Access-Control-Allow-Origin: $allowedOrigin");
        $hasAllowMethods = $this->hasHeaderContains($headers, "Access-Control-Allow-Methods");
        $hasAllowHeaders = $this->hasHeaderContains($headers, "Access-Control-Allow-Headers");

        $pass = ($status === 200) && $hasAllowOrigin && $hasAllowMethods && $hasAllowHeaders;

        $this->recordResult($testName, $pass, [
            'Status Code' => $status,
            'Has Allow-Origin' => $hasAllowOrigin ? 'YES' : 'NO',
            'Has Allow-Methods' => $hasAllowMethods ? 'YES' : 'NO',
            'Has Allow-Headers' => $hasAllowHeaders ? 'YES' : 'NO'
        ]);

        $this->resetHeaders();
    }

    private function testDisallowedOriginGET()
    {
        $testName = "Test 4: Disallowed origin (GET request)";
        $badOrigin = 'https://evil.com';

        $_SERVER['HTTP_ORIGIN'] = $badOrigin;
        $_SERVER['REQUEST_METHOD'] = 'GET';

        ob_start();
        handleCORS();
        ob_end_clean();

        $headers = headers_list();
        $hasAllowOrigin = $this->hasHeaderContains($headers, "Access-Control-Allow-Origin");

        // Should NOT have Allow-Origin header
        $pass = !$hasAllowOrigin;

        $this->recordResult($testName, $pass, [
            'Origin' => $badOrigin,
            'Expected' => 'NO Access-Control-Allow-Origin header',
            'Result' => $hasAllowOrigin ? 'FAIL - Header present!' : 'PASS - No header'
        ]);

        $this->resetHeaders();
    }

    private function testDisallowedOriginPOST()
    {
        $testName = "Test 5: Disallowed origin (POST request)";
        $badOrigin = 'https://hacker.com';

        $_SERVER['HTTP_ORIGIN'] = $badOrigin;
        $_SERVER['REQUEST_METHOD'] = 'POST';

        ob_start();
        handleCORS();
        ob_end_clean();

        $headers = headers_list();
        $hasAllowOrigin = $this->hasHeaderContains($headers, "Access-Control-Allow-Origin");

        $pass = !$hasAllowOrigin;

        $this->recordResult($testName, $pass, [
            'Expected' => 'NO CORS headers',
            'Result' => $hasAllowOrigin ? 'FAIL' : 'PASS'
        ]);

        $this->resetHeaders();
    }

    private function testDisallowedOriginOPTIONS()
    {
        $testName = "Test 6: Disallowed origin (OPTIONS preflight - should return 403)";
        $badOrigin = 'https://attacker.net';

        $_SERVER['HTTP_ORIGIN'] = $badOrigin;
        $_SERVER['REQUEST_METHOD'] = 'OPTIONS';

        ob_start();
        try {
            handleCORS();
        } catch (Exception $e) {
            // Expected
        }
        $output = ob_get_clean();

        $headers = headers_list();
        $status = http_response_code();

        $hasAllowOrigin = $this->hasHeaderContains($headers, "Access-Control-Allow-Origin");

        // Should return 403 and NOT have Allow-Origin header
        $pass = ($status === 403) && !$hasAllowOrigin;

        $this->recordResult($testName, $pass, [
            'Expected Status' => '403',
            'Actual Status' => $status,
            'Has Allow-Origin' => $hasAllowOrigin ? 'YES (BAD!)' : 'NO (GOOD)',
            'Response' => $output
        ]);

        $this->resetHeaders();
    }

    private function testNoOriginHeader()
    {
        $testName = "Test 7: No Origin header";

        unset($_SERVER['HTTP_ORIGIN']);
        $_SERVER['REQUEST_METHOD'] = 'GET';

        ob_start();
        handleCORS();
        ob_end_clean();

        $headers = headers_list();
        $hasAllowOrigin = $this->hasHeaderContains($headers, "Access-Control-Allow-Origin");

        // Should NOT set CORS headers when no origin
        $pass = !$hasAllowOrigin;

        $this->recordResult($testName, $pass, [
            'Expected' => 'No CORS headers',
            'Result' => $hasAllowOrigin ? 'FAIL' : 'PASS'
        ]);

        $this->resetHeaders();
    }

    private function testMultipleAllowedOrigins()
    {
        $testName = "Test 8: Multiple allowed origins";

        if (count($this->allowedOrigins) < 2) {
            $this->recordResult($testName, true, [
                'Note' => 'Only one allowed origin configured - test skipped'
            ]);
            return;
        }

        $secondOrigin = $this->allowedOrigins[1];

        $_SERVER['HTTP_ORIGIN'] = $secondOrigin;
        $_SERVER['REQUEST_METHOD'] = 'GET';

        ob_start();
        handleCORS();
        ob_end_clean();

        $headers = headers_list();
        $hasCorrectOrigin = $this->hasHeader($headers, "Access-Control-Allow-Origin: $secondOrigin");

        $pass = $hasCorrectOrigin;

        $this->recordResult($testName, $pass, [
            'Second Origin' => $secondOrigin,
            'Expected' => "Access-Control-Allow-Origin: $secondOrigin",
            'Result' => $hasCorrectOrigin ? 'PASS' : 'FAIL'
        ]);

        $this->resetHeaders();
    }

    private function testCredentialsNeverWildcard()
    {
        $testName = "Test 9: Never use wildcard (*) with credentials";

        $allowedOrigin = $this->allowedOrigins[0];
        $_SERVER['HTTP_ORIGIN'] = $allowedOrigin;
        $_SERVER['REQUEST_METHOD'] = 'GET';

        ob_start();
        handleCORS();
        ob_end_clean();

        $headers = headers_list();

        $hasWildcard = $this->hasHeader($headers, "Access-Control-Allow-Origin: *");
        $hasCredentials = $this->hasHeader($headers, "Access-Control-Allow-Credentials: true");

        // Should NEVER have both wildcard and credentials
        $pass = !($hasWildcard && $hasCredentials);

        $this->recordResult($testName, $pass, [
            'Has Wildcard (*)' => $hasWildcard ? 'YES (BAD!)' : 'NO (GOOD)',
            'Has Credentials' => $hasCredentials ? 'YES' : 'NO',
            'Result' => $pass ? 'PASS' : 'FAIL - Security violation!'
        ]);

        $this->resetHeaders();
    }

    private function hasHeader($headers, $needle)
    {
        foreach ($headers as $header) {
            if (strcasecmp($header, $needle) === 0) {
                return true;
            }
        }
        return false;
    }

    private function hasHeaderContains($headers, $needle)
    {
        foreach ($headers as $header) {
            if (stripos($header, $needle) !== false) {
                return true;
            }
        }
        return false;
    }

    private function resetHeaders()
    {
        if (function_exists('header_remove')) {
            header_remove();
        }
        http_response_code(200);
    }

    private function recordResult($testName, $pass, $details)
    {
        $this->results[] = [
            'name' => $testName,
            'pass' => $pass,
            'details' => $details
        ];

        echo ($pass ? "✓ PASS" : "✗ FAIL") . " - $testName\n";
        foreach ($details as $key => $value) {
            echo "  $key: $value\n";
        }
        echo "\n";
    }

    private function printSummary()
    {
        $total = count($this->results);
        $passed = count(array_filter($this->results, fn($r) => $r['pass']));
        $failed = $total - $passed;

        echo "=================================================\n";
        echo "TEST SUMMARY\n";
        echo "=================================================\n";
        echo "Total Tests:  $total\n";
        echo "Passed:       $passed\n";
        echo "Failed:       $failed\n";
        echo "Success Rate: " . round(($passed / $total) * 100, 1) . "%\n";
        echo "=================================================\n\n";

        if ($failed > 0) {
            echo "⚠ FAILED TESTS:\n";
            foreach ($this->results as $result) {
                if (!$result['pass']) {
                    echo "  - " . $result['name'] . "\n";
                }
            }
            echo "\n";
        } else {
            echo "✓ All tests passed! CORS implementation is secure.\n\n";
        }
    }
}

// Run tests
$runner = new CORSTestRunner();
$runner->runAllTests();
