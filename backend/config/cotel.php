<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Token administrativo COTEL
    |--------------------------------------------------------------------------
    | Protege las escrituras y la consola SQL en vivo (header x-admin-token).
    | Mismo valor que el ADMIN_TOKEN del backend Express original. Si no está
    | definido, los endpoints protegidos responden 503.
    */

    'admin_token' => env('ADMIN_TOKEN'),

    /*
    |--------------------------------------------------------------------------
    | Cache del Padrón
    |--------------------------------------------------------------------------
    | Configuración del caching para el padrón de abonados.
    | Usa Redis preferiblemente, con fallback a file/database.
    */

    'cache_ttl_minutes' => (int) env('PADRON_CACHE_TTL_MINUTES', 5),
    'cache_enabled' => env('PADRON_CACHE_ENABLED', true),

];
