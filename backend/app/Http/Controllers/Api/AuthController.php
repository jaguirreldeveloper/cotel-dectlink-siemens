<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Operador;
use App\Support\OperatorToken;
use App\Support\Permissions;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use OpenApi\Attributes as OA;

/**
 * Autenticación de Operadores para la aplicación COTEL DECTlink.
 *
 * @OA\Tag(name="Auth", description="Autenticación y perfiles de operadores")
 */
class AuthController extends Controller
{
    /**
     * Iniciar sesión con email y contraseña.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'El correo electrónico es requerido.',
            'email.email' => 'Ingrese un correo electrónico válido.',
            'password.required' => 'La contraseña es requerida.',
        ]);

        $email = strtolower(trim((string) $validated['email']));
        $operador = Operador::query()->whereRaw('lower(email) = ?', [$email])->first();

        if (! $operador instanceof Operador || ! Hash::check((string) $validated['password'], $operador->password)) {
            return response()->json([
                'message' => 'Credenciales inválidas. Verifique su correo y contraseña.',
            ], 422);
        }

        if (! $operador->activo) {
            return response()->json([
                'message' => 'Esta cuenta de operador ha sido desactivada. Contacte a la jefatura de planta externa de COTEL.',
            ], 403);
        }

        $operador->last_login_at = now()->toDateTimeString();
        $operador->save();

        $token = OperatorToken::generate($operador);

        return response()->json([
            'token' => $token,
            'operador' => $this->perfil($operador),
            'message' => 'Inicio de sesión exitoso.',
        ]);
    }

    /**
     * Obtener el perfil del operador autenticado actualmente.
     */
    public function me(Request $request): JsonResponse
    {
        $operador = OperatorToken::resolve($request);

        if (! $operador instanceof Operador) {
            return response()->json([
                'message' => 'No autenticado o sesión expirada.',
            ], 401);
        }

        return response()->json([
            'operador' => $this->perfil($operador),
        ]);
    }

    /**
     * Perfil público del operador: identidad, ámbito organizacional y
     * permisos efectivos (rol + excepciones), para que el frontend use `can()`.
     *
     * @return array<string, mixed>
     */
    private function perfil(Operador $operador): array
    {
        return [
            'id' => $operador->id,
            'email' => $operador->email,
            'nombre' => $operador->nombre ?? 'Operador',
            'role' => $operador->rolCanonico(),
            'activo' => $operador->activo,
            'puesto' => $operador->puesto,
            'especialidad' => $operador->especialidad,
            'area' => $operador->area,
            'departamento' => $operador->departamento,
            'zonaId' => $operador->zona_id,
            'turno' => $operador->turno,
            'supervisorId' => $operador->supervisor_id,
            'permisos' => Permissions::para($operador),
            'lastLoginAt' => ($v = $operador->getAttribute('last_login_at')) !== null ? Carbon::parse($v)->toISOString() : null,
        ];
    }

    /**
     * Cerrar sesión.
     *
     * Rota el nonce de revocación del operador: todos los tokens emitidos
     * para su cuenta quedan inválidos de inmediato en el lado servidor,
     * además de descartarse el token en el cliente.
     */
    public function logout(Request $request): JsonResponse
    {
        $operador = OperatorToken::resolve($request);

        if ($operador instanceof Operador) {
            $operador->rotarNonceDeTokens();
        }

        return response()->json([
            'message' => 'Sesión cerrada exitosamente.',
        ]);
    }
}
