<?php

namespace App\Support;

use App\Models\Operador;

/**
 * Resolución de permisos efectivos: rol canónico + excepciones del usuario.
 *
 * Regla: `permisos del rol ∪ permisos_extra − permisos_denegados`.
 * El denegado gana siempre, y las claves desconocidas se descartan para que
 * un valor arbitrario en BD no pueda otorgar acciones inexistentes.
 */
final class Permissions
{
    /**
     * @return list<string>
     */
    public static function claves(): array
    {
        $claves = [];
        foreach (config('permissions.modulos', []) as $modulo) {
            foreach ($modulo['permisos'] as $permiso) {
                $claves[] = $permiso['clave'];
            }
        }

        return array_values(array_unique($claves));
    }

    /**
     * @return list<string>
     */
    public static function permitidasPorRol(string $rol): array
    {
        $permitidas = [];
        foreach (config('permissions.modulos', []) as $modulo) {
            foreach ($modulo['permisos'] as $permiso) {
                if (in_array($rol, $permiso['roles'], true)) {
                    $permitidas[] = $permiso['clave'];
                }
            }
        }

        return $permitidas;
    }

    /**
     * @return list<string>
     */
    public static function para(Operador $operador): array
    {
        $conocidas = self::claves();
        $extra = array_values(array_filter(
            $operador->permisos_extra ?? [],
            static fn (mixed $clave): bool => is_string($clave) && in_array($clave, $conocidas, true)
        ));
        $denegados = array_values(array_filter(
            $operador->permisos_denegados ?? [],
            static fn (mixed $clave): bool => is_string($clave) && in_array($clave, $conocidas, true)
        ));

        return array_values(array_unique(array_diff(
            array_merge(self::permitidasPorRol($operador->rolCanonico()), $extra),
            $denegados
        )));
    }

    public static function tiene(Operador $operador, string $clave): bool
    {
        return in_array($clave, self::para($operador), true);
    }

    /**
     * Filtra un array de claves enviado por el cliente contra el catálogo.
     *
     * @param  list<mixed>  $claves
     * @return list<string>
     */
    public static function filtrarClaves(array $claves): array
    {
        $conocidas = self::claves();

        return array_values(array_unique(array_filter(
            $claves,
            static fn (mixed $clave): bool => is_string($clave) && in_array($clave, $conocidas, true)
        )));
    }
}
