<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(
    title: 'COTEL DECtlink API',
    version: '1.0.0',
    description: 'API para gestion de planta externa Siemens DECtlink'
)]
#[OA\Server(
    url: 'http://localhost:8010',
    description: 'Servidor de desarrollo local'
)]
#[OA\SecurityScheme(
    securityScheme: 'adminToken',
    type: 'apiKey',
    in: 'header',
    name: 'x-admin-token'
)]
class Info {}
