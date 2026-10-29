<?php

namespace App\Models;

use Database\Factories\PadronCargaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Lote de carga tipo padrón (dry-run + aplicación).
 *
 * El detalle de sugerencias vive en padron_cargas_detalles; el padrón
 * vigente (abonados_lineas) NO cambia hasta que SUPERADMIN aplica.
 *
 * @property int                  $id
 * @property string               $archivo
 * @property int|null             $operador_id
 * @property int                  $total_filas
 * @property int                  $nuevos
 * @property int                  $actualizar
 * @property int                  $sin_cambios
 * @property int                  $rechazados
 * @property int                  $la_paz
 * @property int                  $el_alto
 * @property int                  $sin_ciudad
 * @property string               $estado
 * @property int|null             $aplicado_por
 * @property \Carbon\Carbon|null  $aplicado_en
 */
class PadronCarga extends Model
{
    /** @use HasFactory<PadronCargaFactory> */
    use HasFactory;

    public const ESTADO_PENDIENTE = 'PENDIENTE';

    public const ESTADO_APLICADO = 'APLICADO';

    public const ESTADO_ANULADO = 'ANULADO';

    public const CIUDAD_LA_PAZ = 'LA_PAZ';

    public const CIUDAD_EL_ALTO = 'EL_ALTO';

    public const CIUDAD_SIN = 'SIN_CIUDAD';

    public const ACCION_NUEVO = 'NUEVO';

    public const ACCION_ACTUALIZAR = 'ACTUALIZAR';

    public const ACCION_SIN_CAMBIOS = 'SIN_CAMBIOS';

    public const ACCION_RECHAZADO = 'RECHAZADO';

    public $timestamps = false;

    protected $table = 'padron_cargas';

    protected $fillable = [
        'archivo', 'operador_id', 'total_filas', 'nuevos', 'actualizar',
        'sin_cambios', 'rechazados', 'la_paz', 'el_alto', 'sin_ciudad',
        'estado', 'aplicado_por', 'aplicado_en',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'aplicado_en' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<PadronCargaDetalle, $this>
     */
    public function detalles(): HasMany
    {
        return $this->hasMany(PadronCargaDetalle::class, 'id_carga');
    }

    /**
     * @return BelongsTo<Operador, $this>
     */
    public function operador(): BelongsTo
    {
        return $this->belongsTo(Operador::class, 'operador_id');
    }
}
