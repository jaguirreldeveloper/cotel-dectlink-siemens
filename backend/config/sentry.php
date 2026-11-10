<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Sentry Configuration
    |--------------------------------------------------------------------------
    | 
    | This file configures Sentry for the COTEL DECTlink application.
    | Sentry is used for error monitoring and tracking in production.
    |
    */

    // Sentry DSN (Data Source Name)
    // Get this from your Sentry project settings
    'dsn' => env('SENTRY_DSN'),

    // Sentry environment (production, staging, development, etc.)
    'environment' => env('SENTRY_ENVIRONMENT', env('APP_ENV', 'production')),

    // Enable Sentry only in production
    'enabled' => env('SENTRY_ENABLED', true),

    // Release version (optional, can be set automatically)
    'release' => env('SENTRY_RELEASE'),

    // Configure which exceptions should be reported to Sentry
    'report_exceptions' => [
        // Report all exceptions
        '*' => true,
        
        // Don't report these exceptions (they are expected)
        'Illuminate\\Auth\\AuthenticationException' => false,
        'Illuminate\\Validation\\ValidationException' => false,
        'Illuminate\\Http\\Exceptions\\ThrottleRequestsException' => false,
    ],

    // Configure which logs should be reported to Sentry
    'report_logs' => [
        // Report errors and above
        'error' => true,
        'warning' => false,
        'info' => false,
        'debug' => false,
    ],

    // Additional context to send with each event
    'context' => [
        // Include user information
        'user' => [
            'ip_address' => true,
            'user_agent' => true,
        ],
        
        // Include request information
        'request' => [
            'headers' => true,
            'query_string' => true,
            'body' => true,
            'cookies' => false,
        ],
        
        // Include server information
        'server' => [
            'hostname' => true,
        ],
    ],

    // Breadcrumbs configuration
    // Breadcrumbs are events that happened before the error
    'breadcrumbs' => [
        // SQL queries
        'sql_queries' => true,
        
        // HTTP requests
        'http_requests' => true,
        
        // Log entries
        'logs' => true,
        
        // Cache operations
        'cache' => true,
        
        // Jobs
        'jobs' => true,
    ],

    // Tracing configuration (performance monitoring)
    'tracing' => [
        'enabled' => env('SENTRY_TRACING_ENABLED', true),
        
        // Sample rate for traces (0.0 to 1.0)
        'sample_rate' => (float) env('SENTRY_TRACING_SAMPLE_RATE', 0.2),
        
        // SQL queries tracing
        'sql_queries' => true,
        
        // HTTP requests tracing
        'http_requests' => true,
        
        // Slow SQL query threshold in milliseconds
        'slow_sql_threshold' => 1000,
    ],

    // Sentry CLI configuration
    'cli' => [
        'dsn' => env('SENTRY_CLI_DSN'),
        
        // Sentry organization
        'organization' => env('SENTRY_ORGANIZATION'),
        
        // Sentry project
        'project' => env('SENTRY_PROJECT'),
        
        // Sentry auth token
        'auth_token' => env('SENTRY_AUTH_TOKEN'),
    ],

    // Sentry performance monitoring configuration
    'performance' => [
        // Enable performance monitoring
        'enabled' => env('SENTRY_PERFORMANCE_ENABLED', true),
        
        // Routes to monitor (null = all routes)
        'routes' => [
            'api/*',
        ],
        
        // Slow transaction threshold in milliseconds
        'slow_transaction_threshold' => 2000,
    ],

];
