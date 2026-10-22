<?php

namespace App\Models;

use Carbon\Carbon;
use Database\Factories\BitacoraFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Auditoría de cambios de estado / calibraciones GPS (FK a la línea;
 * sin created_at: el instante vive en la columna `timestamp`).
 *
 * @property int $id
 * @property int $abonado_nro
 * @property Carbon $timestamp
 * @property-read Subscriber|null $abonado
 */
#[Fillable([
    'abonado_nro', 'estado_anterior', 'nuevo_estado', 'detalle', 'tecnico', 'timestamp',
])]
class Bitacora extends Model
{
    /** @use HasFactory<BitacoraFactory> */
    use HasFactory;

    protected $table = 'bitacora';

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
        ];
    }

    public function abonado(): BelongsTo
    {
        return $this->belongsTo(Subscriber::class, 'abonado_nro', 'nro');
    }
}
