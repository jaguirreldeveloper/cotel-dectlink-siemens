<?php

namespace App\Models;

use Database\Factories\CentralFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Central telefónica (madre) de la planta externa DECTlink.
 *
 * Nivel raíz de la jerarquía: subcentrales → shelters → armarios,
 * y las celdas (RFP) dependen funcionalmente de una subcentral.
 *
 * @property int $id
 * @property string $codigo
 * @property string $nombre
 * @property string|null $direccion
 * @property float|null $lat
 * @property float|null $lng
 * @property string|null $observacion
 * @property bool $activo
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 */
class Central extends Model
{
    /** @use HasFactory<CentralFactory> */
    use HasFactory;

    protected $table = 'centrales';

    protected $fillable = [
        'codigo',
        'nombre',
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
            'lat' => 'float',
            'lng' => 'float',
            'activo' => 'boolean',
        ];
    }
}
