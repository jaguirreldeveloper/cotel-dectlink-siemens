<?php

namespace App\Models;

use Database\Factories\CellFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Estación base Siemens DECTlink (RFP). La PK `id` es el número de RFP
 * y no es autoincremental.
 *
 * @property int $id
 * @property string $codigo
 * @property string $nombre
 * @property string $tecnologia
 * @property string|null $descripcion
 * @property string|null $rfp_modelo
 * @property string|null $banda_frecuencia
 * @property int|null $capacidad_canales
 * @property float|null $radio_cobertura_km
 * @property float|null $latitud
 * @property float|null $longitud
 * @property int|null $id_subcentral
 * @property string $departamento
 * @property string|null $municipio
 * @property int|null $zona_id
 * @property string|null $direccion
 * @property int|null $capacidad_abonados_prevista
 * @property string $estado
 * @property bool $activo
 * @property-read Subcentral|null $subcentral
 * @property-read Zone|null $zona
 */
#[Fillable([
    'id', 'codigo', 'nombre', 'tecnologia', 'descripcion', 'rfp_modelo', 'banda_frecuencia',
    'capacidad_canales', 'radio_cobertura_km', 'latitud', 'longitud', 'id_subcentral',
    'departamento', 'municipio', 'zona_id', 'direccion', 'capacidad_abonados_prevista',
    'estado', 'activo',
])]
class Cell extends Model
{
    /** @use HasFactory<CellFactory> */
    use HasFactory;

    protected $table = 'celdas';

    public const UPDATED_AT = null;

    public $incrementing = false;

    protected $keyType = 'int';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'capacidad_canales' => 'integer',
            'capacidad_abonados_prevista' => 'integer',
            'radio_cobertura_km' => 'float',
            'latitud' => 'float',
            'longitud' => 'float',
            'zona_id' => 'integer',
            'activo' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Subscriber, $this>
     */
    public function lineas(): HasMany
    {
        return $this->hasMany(Subscriber::class, 'id_celda');
    }

    /**
     * Subcentral de servicio de la RFP (opcional hasta asignación por UI).
     *
     * @return BelongsTo<Subcentral, $this>
     */
    public function subcentral(): BelongsTo
    {
        return $this->belongsTo(Subcentral::class, 'id_subcentral');
    }

    /** Zona/carril de planta externa a la que sirve esta RFP. */
    public function zona(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'zona_id');
    }
}
