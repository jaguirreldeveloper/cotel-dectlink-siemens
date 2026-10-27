<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Auditoría del módulo Infraestructura: cada escritura deja aquí qué
 * tabla/registro cambió, qué acción, quién (operador) y el payload antes/
 * después. Separada de la bitácora de abonados.
 *
 * @property int $id
 * @property string $tabla
 * @property int $registro_id
 * @property string $accion
 * @property int|null $operador_id
 * @property array|null $payload
 */
#[Fillable(['tabla', 'registro_id', 'accion', 'operador_id', 'payload'])]
class InfraestructuraBitacora extends Model
{
    public const ACCION_CREAR = 'CREAR';

    public const ACCION_MODIFICAR = 'MODIFICAR';

    public const ACCION_DESACTIVAR = 'DESACTIVAR';

    public const ACCION_ELIMINAR = 'ELIMINAR';

    public $timestamps = false;

    protected $table = 'infraestructura_bitacora';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
