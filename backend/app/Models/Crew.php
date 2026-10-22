<?php

namespace App\Models;

use Database\Factories\CrewFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Cuadrilla de planta externa (PK slug generado del nombre;
 * integrantes guardado como literal text[] de PostgreSQL).
 *
 * @property string $id
 * @property string $nombre
 * @property string $estado
 * @property float|null $lat_actual
 * @property float|null $lng_actual
 */
#[Fillable([
    'id', 'nombre', 'integrantes', 'vehiculo', 'zona_asignada',
    'estado', 'telefono_contacto', 'lat_actual', 'lng_actual',
])]
class Crew extends Model
{
    /** @use HasFactory<CrewFactory> */
    use HasFactory;

    protected $table = 'cuadrillas';

    public const UPDATED_AT = null;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'lat_actual' => 'float',
            'lng_actual' => 'float',
        ];
    }

    /**
     * @return HasMany<WorkOrder, $this>
     */
    public function ordenes(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'cuadrilla_id');
    }
}
