<?php

namespace App\Models;

use Database\Factories\SubscriberFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Línea telefónica del padrón maestro (tabla abonados_lineas).
 * Las respuestas de la API se construyen desde SubscriberQuery/SubscriberRow
 * para garantizar la paridad byte a byte; este modelo es para lógica interna.
 *
 * @property int $id
 * @property int $nro
 * @property string $numero_telefono
 * @property string $codigo_area
 * @property int|null $contrato
 * @property int|null $id_cliente
 * @property int|null $id_celda
 * @property string|null $fecha_servicio
 * @property string $estado_servicio
 * @property string $estado_operativo
 * @property string|null $signal_dect
 * @property float|null $lat
 * @property float|null $lng
 * @property-read Client|null $cliente
 * @property-read Cell|null $celda
 */
#[Fillable([
    'nro', 'numero_telefono', 'codigo_area', 'contrato', 'id_cliente', 'id_celda',
    'estado_servicio', 'estado_operativo', 'fecha_servicio', 'fau_model', 'signal_dect',
    'deuda_meses', 'tiempo_deposito_meses', 'falla_descripcion', 'lat', 'lng',
    'distancia_km', 'azimut_grados', 'nro_registro_origen', 'archivo_origen', 'zona_origen',
])]
class Subscriber extends Model
{
    /** @use HasFactory<SubscriberFactory> */
    use HasFactory;

    protected $table = 'abonados_lineas';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'contrato' => 'integer',
            'deuda_meses' => 'integer',
            'tiempo_deposito_meses' => 'integer',
            'azimut_grados' => 'integer',
            'nro_registro_origen' => 'integer',
            'lat' => 'float',
            'lng' => 'float',
            'distancia_km' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Client, $this>
     */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'id_cliente');
    }

    /**
     * @return BelongsTo<Cell, $this>
     */
    public function celda(): BelongsTo
    {
        return $this->belongsTo(Cell::class, 'id_celda');
    }

    /**
     * @return HasMany<Bitacora, $this>
     */
    public function bitacora(): HasMany
    {
        return $this->hasMany(Bitacora::class, 'abonado_nro', 'nro');
    }
}
