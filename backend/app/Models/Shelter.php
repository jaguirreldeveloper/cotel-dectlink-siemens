<?php

namespace App\Models;

use Database\Factories\ShelterFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Shelter: caseta con rack, clima y banco de baterías de una subcentral.
 *
 * @property int $id
 * @property string $codigo
 * @property string $nombre
 * @property int $id_subcentral
 * @property float|null $kva_rectificador
 * @property int|null $autonomia_baterias_horas
 * @property string $estado_clima
 * @property string|null $direccion
 * @property float|null $lat
 * @property float|null $lng
 * @property string|null $observacion
 * @property bool $activo
 */
class Shelter extends Model
{
    /** @use HasFactory<ShelterFactory> */
    use HasFactory;

    public const CLIMA_AIRE = 'AIRE';

    public const CLIMA_VENTILACION = 'VENTILACION';

    public const CLIMA_FUERA_SERVICIO = 'FUERA_SERVICIO';

    protected $table = 'shelters';

    protected $fillable = [
        'codigo',
        'nombre',
        'id_subcentral',
        'direccion',
        'kva_rectificador',
        'autonomia_baterias_horas',
        'estado_clima',
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
            'kva_rectificador' => 'float',
            'autonomia_baterias_horas' => 'integer',
            'lat' => 'float',
            'lng' => 'float',
            'activo' => 'boolean',
        ];
    }

    public function subcentral(): BelongsTo
    {
        return $this->belongsTo(Subcentral::class, 'id_subcentral');
    }

    /**
     * @return HasMany<Armario, $this>
     */
    public function armarios(): HasMany
    {
        return $this->hasMany(Armario::class, 'id_shelter');
    }
}
