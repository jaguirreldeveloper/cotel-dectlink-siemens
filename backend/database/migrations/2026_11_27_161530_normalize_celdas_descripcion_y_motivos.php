<?php

use App\Support\CellCatalog;
use App\Support\CellDescription;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Quita el nombre de `descripcion` y codifica los motivos heredados del CSV. */
    public function up(): void
    {
        foreach (DB::table('celdas')->select('id', 'descripcion', 'codigo_dpi', 'motivo_estado')->orderBy('id')->get() as $celda) {
            $descripcion = CellDescription::normalizar($celda->descripcion, $celda->codigo_dpi);
            $motivo = $celda->motivo_estado !== null && isset(CellCatalog::MOTIVOS_LEGADOS[$celda->motivo_estado])
                ? CellCatalog::MOTIVOS_LEGADOS[$celda->motivo_estado]
                : $celda->motivo_estado;

            if ($descripcion !== $celda->descripcion || $motivo !== $celda->motivo_estado) {
                DB::table('celdas')->where('id', $celda->id)->update([
                    'descripcion' => $descripcion,
                    'motivo_estado' => $motivo,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Los textos originales del CSV no se pueden reconstruir de forma fiable.
    }
};
