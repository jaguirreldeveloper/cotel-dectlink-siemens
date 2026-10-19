<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints Git (stub en Laravel Cloud): el filesystem de la plataforma es
 * efímero y no expone el repo, así que la migración Git remota queda
 * deshabilitada (paridad de forma con los payloads del Express original).
 */
class GitController extends Controller
{
    private const NO_DISPONIBLE = 'La integración Git no está disponible en Laravel Cloud (entorno efímero sin repositorio). Use la integración con GitHub del propio repositorio.';

    /**
     * GET /api/git/status — siempre "no inicializado" para que el modal lo
     * muestre de forma elegante (mismo shape que el backend Express).
     */
    public function status(): JsonResponse
    {
        return response()->json([
            'initialized' => false,
            'branch' => null,
            'lastCommit' => null,
            'remoteUrl' => null,
            'changedFiles' => 0,
        ]);
    }

    /**
     * POST /api/git/init (admin) — deshabilitado.
     */
    public function init(): JsonResponse
    {
        return response()->json(['success' => false, 'error' => self::NO_DISPONIBLE], 501);
    }

    /**
     * POST /api/git/remote (admin) — deshabilitado.
     */
    public function remote(Request $request): JsonResponse
    {
        return response()->json(['success' => false, 'error' => self::NO_DISPONIBLE], 501);
    }
}
