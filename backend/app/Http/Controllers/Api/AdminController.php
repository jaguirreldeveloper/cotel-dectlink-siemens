<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

/**
 * Controlador para operaciones administrativas avanzadas.
 * Estas operaciones requieren autenticación con token de administrador.
 * 
 * Este controlador proporciona endpoints que antes se ejecutaban desde
 * scripts CLI, permitiendo su ejecución segura a través de la API.
 */
class AdminController extends Controller
{
    /**
     * Ejecutar un comando administrativo.
     * 
     * Este endpoint permite ejecutar comandos CLI de Laravel de manera segura
     * a través de la API, autenticado con el token de administrador.
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function executeCommand(Request $request): JsonResponse
    {
        // Validar el token de administrador
        $adminToken = $request->header('x-admin-token');
        if (!$this->validateAdminToken($adminToken)) {
            return response()->json([
                'success' => false,
                'error' => 'Token de administrador inválido o no proporcionado',
            ], 401);
        }

        // Validar los parámetros
        $validator = Validator::make($request->all(), [
            'command' => 'required|string',
            'args' => 'nullable|array',
            'args.*' => 'string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => 'Parámetros inválidos',
                'details' => $validator->errors(),
            ], 422);
        }

        $command = $request->input('command');
        $args = $request->input('args', []);

        // Lista blanca de comandos permitidos
        $allowedCommands = [
            'db:check',
            'db:verify',
            'db:clean',
            'cache:clear',
            'config:clear',
            'route:clear',
            'view:clear',
        ];

        // Verificar si el comando está permitido
        if (!in_array($command, $allowedCommands)) {
            return response()->json([
                'success' => false,
                'error' => 'Comando no permitido: ' . $command,
                'allowed' => $allowedCommands,
            ], 403);
        }

        try {
            // Construir el comando artisan
            $artisanCommand = ['php', 'artisan', $command];
            $artisanCommand = array_merge($artisanCommand, $args);

            // Ejecutar el comando con timeout
            $process = new Process($artisanCommand, base_path());
            $process->setTimeout(300); // 5 minutos de timeout

            // Ejecutar y capturar salida
            $process->run();

            if (!$process->isSuccessful()) {
                throw new ProcessFailedException($process);
            }

            $output = $process->getOutput();
            $errorOutput = $process->getErrorOutput();

            return response()->json([
                'success' => true,
                'command' => $command,
                'output' => $output,
                'error' => $errorOutput,
                'exitCode' => $process->getExitCode(),
            ]);

        } catch (ProcessFailedException $e) {
            return response()->json([
                'success' => false,
                'error' => 'El comando falló',
                'command' => $command,
                'output' => $e->getProcess()->getOutput(),
                'errorOutput' => $e->getProcess()->getErrorOutput(),
                'exitCode' => $e->getProcess()->getExitCode(),
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al ejecutar el comando: ' . $e->getMessage(),
                'command' => $command,
            ], 500);
        }
    }

    /**
     * Obtener información de conexión de la base de datos.
     * 
     * @return JsonResponse
     */
    public function connectionInfo(): JsonResponse
    {
        // Validar el token de administrador
        $adminToken = request()->header('x-admin-token');
        if (!$this->validateAdminToken($adminToken)) {
            return response()->json([
                'success' => false,
                'error' => 'Token de administrador inválido o no proporcionado',
            ], 401);
        }

        try {
            $connection = DB::connection('pgsql');
            
            return response()->json([
                'success' => true,
                'connected' => true,
                'driver' => 'pgsql',
                'host' => config('database.connections.pgsql.host'),
                'port' => config('database.connections.pgsql.port'),
                'database' => config('database.connections.pgsql.database'),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener información de conexión: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Validar el token de administrador.
     * 
     * @param string|null $token
     * @return bool
     */
    private function validateAdminToken(?string $token): bool
    {
        if (empty($token)) {
            return false;
        }

        $validToken = env('ADMIN_TOKEN');
        
        if (empty($validToken)) {
            // Si no hay token configurado, no se puede validar
            return false;
        }

        return hash_equals($validToken, $token);
    }
}
