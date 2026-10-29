<?php

namespace App\Models;

use Database\Factories\SubcentralFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Subcentral (central hija / remota / concentradora) de planta externa.
 *
 * Cuelga de una central madre. De ella dependen los shelters y las celdas
 * (RFP DECTlink); los armarios pertenecen a un shelter de la subcentral.
 *
 * @property int $id
 * @property string $codigo
 * @property string $nombre
 * @property int $id_central
 * @property string $modo_enlace
 * @property float|null $distancia_km
 * @property string|null $direccion
 * @property float|null $lat
 * @property float|null $lng
 * @property string|null $observacion
 * @property bool $activo
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\Central|null $central
 */
class Subcentral extends Model
{
    /** @use HasFactory<SubcentralFactory> */
    use HasFactory;

    protected $table = 'subcentrales';

    protected $fillable = [
        'codigo',
        'nombre',
        'id_central',
        'modo_enlace',
        'distancia_km',
        'direccion',
        'lat',
        'lng',
        'observacion',
        'activo',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'distancia_km' => 'float',
            'lat' => 'float',
            'lng' => 'float',
            'activo' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Central, $this>
     */
    public function central(): BelongsTo
    {
        return $this->belongsTo(Central::class, 'id_central');
    }

    /**
     * @return HasMany<Shelter, $this>
     */
    public function shelters(): HasMany
    {
        return $this->hasMany(Shelter::class, 'id_subcentral');
    }

    /**
     * @return HasMany<Cell, $this>
     */
    public function celdas(): HasMany
    {
        return $this->hasMany(Cell::class, 'id_subcentral');
    }
}
