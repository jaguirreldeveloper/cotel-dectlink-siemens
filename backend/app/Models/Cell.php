<?php

namespace App\Models;

use Database\Factories\CellFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Estación base Siemens DECTlink (RFP). La PK `id` es el número de RFP
 * y no es autoincremental.
 *
 * @property int $id
 * @property string $nombre
 * @property string $tecnologia
 * @property float|null $latitud
 * @property float|null $longitud
 */
#[Fillable([
    'id', 'nombre', 'tecnologia', 'descripcion', 'rfp_modelo', 'banda_frecuencia',
    'capacidad_canales', 'radio_cobertura_km', 'latitud', 'longitud',
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
            'radio_cobertura_km' => 'float',
            'latitud' => 'float',
            'longitud' => 'float',
        ];
    }

    /**
     * @return HasMany<Subscriber, $this>
     */
    public function lineas(): HasMany
    {
        return $this->hasMany(Subscriber::class, 'id_celda');
    }
}
