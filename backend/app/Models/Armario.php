<?php

namespace App\Models;

use Database\Factories\ArmarioFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Armario (gabinete) de planta externa: siempre colgando de un shelter.
 *
 * @property int $id
 * @property string $codigo
 * @property string $nombre
 * @property int $id_shelter
 * @property string $tipo
 * @property string|null $ubicacion
 * @property float|null $lat
 * @property float|null $lng
 * @property string|null $observacion
 * @property bool $activo
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\Shelter|null $shelter
 */
class Armario extends Model
{
    /** @use HasFactory<ArmarioFactory> */
    use HasFactory;

    public const TIPO_RFP = 'RFP';

    public const TIPO_DISTRIBUCION = 'DISTRIBUCION';

    public const TIPO_PROTECCION = 'PROTECCION';

    public const TIPO_EMPALMES = 'EMPALMES';

    public const TIPO_OTRO = 'OTRO';

    protected $table = 'armarios';

    protected $fillable = [
        'codigo',
        'nombre',
        'id_shelter',
        'tipo',
        'ubicacion',
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
            'lat' => 'float',
            'lng' => 'float',
            'activo' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Shelter, $this>
     */
    public function shelter(): BelongsTo
    {
        return $this->belongsTo(Shelter::class, 'id_shelter');
    }
}
