<?php

namespace App\Models;

use Database\Factories\WorkOrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Orden de trabajo del kanban (PK UUID autogenerada por la BD; fechas en
 * columnas propias fecha_creacion/fecha_actualizacion/fecha_cierre).
 *
 * @property string $id
 * @property string $codigo
 * @property string $titulo
 * @property string $estado
 * @property string|\DateTimeInterface $fecha_creacion
 * @property string|\DateTimeInterface|null $fecha_cierre
 * @property-read Crew|null $cuadrilla
 * @property-read Subscriber|null $abonado
 */
#[Fillable([
    'codigo', 'titulo', 'descripcion', 'tipo_trabajo', 'prioridad', 'estado',
    'cuadrilla_id', 'tecnico_lider', 'abonado_nro', 'fecha_programada',
    'resultado_tecnico', 'fecha_creacion', 'fecha_actualizacion', 'fecha_cierre',
])]
class WorkOrder extends Model
{
    /** @use HasFactory<WorkOrderFactory> */
    use HasFactory;

    protected $table = 'work_orders';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    public function cuadrilla(): BelongsTo
    {
        return $this->belongsTo(Crew::class, 'cuadrilla_id');
    }

    public function abonado(): BelongsTo
    {
        return $this->belongsTo(Subscriber::class, 'abonado_nro', 'nro');
    }

    /**
     * @return BelongsToMany<Material, $this, Pivot, 'pivot'>
     */
    public function materiales(): BelongsToMany
    {
        return $this->belongsToMany(
            Material::class,
            'work_order_materiales',
            'work_order_id',
            'material_id'
        )->withPivot('cantidad');
    }
}
