<?php

class EnvLoader
{
    public static function load($path)
    {
        if (!file_exists($path)) {
            // Log detailed error on server side
            error_log("CRITICAL: Environment file not found at: $path");
            error_log("Please copy .env.example to .env and configure required variables.");
            
            // Return safe error to client
            http_response_code(500);
            header('Content-Type: application/json');
            die(json_encode([
                'success' => false,
                'error' => 'Server configuration error. Please contact administrator.'
            ]));
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Parse name=value
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);

                // Remove quotes if present
                $value = trim($value, '"\'');

                if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                    putenv(sprintf('%s=%s', $name, $value));
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
        }
    }
    
    /**
     * Validate that required environment variables are set
     * @param array $requiredVars Array of required variable names
     * @return void Exits with error if any required var is missing
     */
    public static function validate($requiredVars)
    {
        $missing = [];
        
        foreach ($requiredVars as $var) {
            $value = getenv($var);
            if ($value === false || $value === '' || $value === null) {
                $missing[] = $var;
            }
        }
        
        if (!empty($missing)) {
            // Log detailed error on server side
            error_log("CRITICAL: Missing required environment variables: " . implode(', ', $missing));
            error_log("Please check your .env file and ensure all required variables are set.");
            
            // Return safe error to client
            http_response_code(500);
            header('Content-Type: application/json');
            die(json_encode([
                'success' => false,
                'error' => 'Server configuration error. Please contact administrator.'
            ]));
        }
    }
}

