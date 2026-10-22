<?php

namespace App\Models;

use Database\Factories\MaterialFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Material del catálogo de repuestos/insumos (nombre único).
 *
 * @property int $id
 * @property string $nombre
 * @property string $unidad
 */
#[Fillable(['nombre', 'unidad'])]
class Material extends Model
{
    /** @use HasFactory<MaterialFactory> */
    use HasFactory;

    protected $table = 'materiales';

    public const UPDATED_AT = null;

    /**
     * @return BelongsToMany<WorkOrder, $this, Pivot, 'pivot'>
     */
    public function ordenes(): BelongsToMany
    {
        return $this->belongsToMany(
            WorkOrder::class,
            'work_order_materiales',
            'material_id',
            'work_order_id'
        )->withPivot('cantidad');
    }
}
