<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints Git (STUB - No disponibles en Laravel Cloud).
 * 
 * En Laravel Cloud, el filesystem es efímero y no expone el repositorio Git,
 * por lo que todas las operaciones de Git remoto están deshabilitadas.
 * 
 * Estos endpoints mantienen paridad con el backend Express original para
 * evitar cambios en el frontend. En producción, se recomienda usar la
 * integración nativa de GitHub/GitLab del repositorio directamente.
 * 
 * @see https://cloud.laravel.com/docs#storage-and-filesystem
 */
class GitController extends Controller
{
    private const NO_DISPONIBLE = 'La integración Git no está disponible en Laravel Cloud (entorno efímero sin repositorio). Use la integración con GitHub del propio repositorio.';

    /**
     * GET /api/git/status
     * 
     * Devuelve el estado de Git. Siempre retorna "no inicializado" para
     * mantener compatibilidad con el frontend.
     * 
     * @response {"initialized": false, "branch": null, "lastCommit": null, "remoteUrl": null, "changedFiles": 0}
     */

    /**
     * GET /api/git/status
     * 
     * Devuelve el estado de Git. Siempre retorna "no inicializado" para
     * mantener compatibilidad con el frontend.
     * 
     * @response {"initialized": false, "branch": null, "lastCommit": null, "remoteUrl": null, "changedFiles": 0}
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
     * POST /api/git/init (admin) — STUB
     * 
     * Inicializaría un repositorio Git local. Deshabilitado en Laravel Cloud.
     * 
     * @response 501 {"success": false, "error": "La integración Git no está disponible..."}
     */
    public function init(): JsonResponse
    {
        return response()->json(['success' => false, 'error' => self::NO_DISPONIBLE], 501);
    }

    /**
     * POST /api/git/remote (admin) — STUB
     * 
     * Configuraría un remote Git. Deshabilitado en Laravel Cloud.
     * 
     * @response 501 {"success": false, "error": "La integración Git no está disponible..."}
     */
    public function remote(Request $request): JsonResponse
    {
        return response()->json(['success' => false, 'error' => self::NO_DISPONIBLE], 501);
    }
}
