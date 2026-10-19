<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Estaciones base Siemens DECTlink (paridad con select().from(celdas) de Drizzle):
 * claves camelCase tal y como las consume CeldasTable en la UI.
 */
class CellsController extends Controller
{
    /**
     * GET /api/cells
     */
    public function index(): JsonResponse
    {
        try {
            $rows = DB::select('SELECT * FROM celdas ORDER BY id ASC');

            return response()->json(array_map(fn (object $row): array => [
                'id' => (int) $row->id,
                'nombre' => $row->nombre,
                'tecnologia' => $row->tecnologia,
                'descripcion' => $row->descripcion,
                'rfpModelo' => $row->rfp_modelo,
                'bandaFrecuencia' => $row->banda_frecuencia,
                'capacidadCanales' => $row->capacidad_canales !== null ? (int) $row->capacidad_canales : null,
                'radioCoberturaKm' => $row->radio_cobertura_km !== null ? (float) $row->radio_cobertura_km : null,
                'latitud' => $row->latitud !== null ? (float) $row->latitud : null,
                'longitud' => $row->longitud !== null ? (float) $row->longitud : null,
                'createdAt' => CarbonImmutable::parse($row->created_at)->toIso8601String(),
            ], $rows));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar celdas en PostgreSQL'], 500);
        }
    }
}
