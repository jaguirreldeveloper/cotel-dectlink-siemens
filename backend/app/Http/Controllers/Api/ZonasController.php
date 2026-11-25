<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;

/** Catálogo de zonas/carriles de planta externa para formularios de celdas. */
class ZonasController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Zone::query()->orderBy('nombre')->get()->map(fn (Zone $zona): array => [
                'id' => (int) $zona->id,
                'nombre' => (string) $zona->nombre,
            ])->all()
        );
    }
}
