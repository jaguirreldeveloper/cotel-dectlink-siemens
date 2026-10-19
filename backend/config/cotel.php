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

];
