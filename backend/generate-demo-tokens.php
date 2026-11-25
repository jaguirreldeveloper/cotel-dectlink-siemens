<?php

/**
 * Genera tokens de los 12 operadores demo para el spec E2E de roles.
 * Uso: `php generate-demo-tokens.php` desde backend/. No se usa en producción.
 */

declare(strict_types=1);

use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/vendor/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$prefijos = [
    'desarrollo', 'admin', 'auditor', 'gerente.gaf', 'gerente.gc', 'gerente.gpp',
    'gerente.gt', 'gerente.gs', 'jefe.depto', 'encargado.area', 'tecnico.campo', 'despacho',
];

$tokens = [];
foreach ($prefijos as $prefijo) {
    $operador = Operador::query()->where('email', $prefijo.'@cotel.bo')->first();
    if ($operador !== null) {
        $tokens[$prefijo] = OperatorToken::generate($operador);
    }
}

file_put_contents(__DIR__.'/storage/app/roles-demo-tokens.json', json_encode($tokens));
echo count($tokens)." tokens generados\n";
