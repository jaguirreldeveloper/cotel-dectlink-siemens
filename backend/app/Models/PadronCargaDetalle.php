<?php

namespace App\Models;

use Database\Factories\PadronCargaDetalleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sugerencia por fila dentro de un lote de carga tipo padrón (dry-run).
 *
 * @property int                       $id
 * @property int                       $id_carga
 * @property int|null                  $nro
 * @property string                    $numero
 * @property string|null               $nombre
 * @property string|null               $direccion
 * @property string|null               $celda
 * @property string|null               $ciudad
 * @property string                    $accion
 * @property string|null               $motivo
 * @property array|null                $campos_cambiados
 */
class PadronCargaDetalle extends Model
{
    /** @use HasFactory<PadronCargaDetalleFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'padron_cargas_detalles';

    protected $fillable = [
        'id_carga', 'nro', 'numero', 'nombre', 'direccion', 'celda',
        'ciudad', 'accion', 'motivo', 'campos_cambiados',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'campos_cambiados' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function carga(): BelongsTo
    {
        return $this->belongsTo(PadronCarga::class, 'id_carga');
    }
}
