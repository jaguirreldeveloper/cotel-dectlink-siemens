<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Operador;
use App\Support\OperatorToken;
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

        $operador->last_login_at = now();
        $operador->save();

        $token = OperatorToken::generate($operador);

        return response()->json([
            'token' => $token,
            'operador' => [
                'id' => $operador->id,
                'email' => $operador->email,
                'nombre' => $operador->nombre ?? 'Operador',
                'role' => $operador->rolCanonico(),
                'activo' => $operador->activo,
                'lastLoginAt' => $operador->last_login_at?->toISOString(),
            ],
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
            'operador' => [
                'id' => $operador->id,
                'email' => $operador->email,
                'nombre' => $operador->nombre ?? 'Operador',
                'role' => $operador->rolCanonico(),
                'activo' => $operador->activo,
                'lastLoginAt' => $operador->last_login_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Cerrar sesión.
     */
    public function logout(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Sesión cerrada exitosamente.',
        ]);
    }
}
