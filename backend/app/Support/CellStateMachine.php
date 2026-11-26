<?php

namespace App\Support;

/**
 * Ciclo de vida y estado eléctrico de una celda RFP. Las transiciones están
 * acotadas para que el historial sea auditable: nunca se "borra" una celda
 * por cambiar de estado.
 */
final class CellStateMachine
{
    public const PLANEADA = 'PLANEADA';

    public const INSTALADA = 'INSTALADA';

    public const EN_SERVICIO = 'EN_SERVICIO';

    public const SUSPENDIDA = 'SUSPENDIDA';

    public const FUERA_DE_SERVICIO = 'FUERA_DE_SERVICIO';

    public const EN_MANTENIMIENTO = 'EN_MANTENIMIENTO';

    public const BAJA = 'BAJA';

    public const RETIRADA = 'RETIRADA';

    public const ENCENDIDA = 'ENCENDIDA';

    public const APAGADA = 'APAGADA';

    public const SIN_ENERGIA = 'SIN_ENERGIA';

    /** @var list<string> */
    public const ESTADOS = [
        self::PLANEADA,
        self::INSTALADA,
        self::EN_SERVICIO,
        self::SUSPENDIDA,
        self::FUERA_DE_SERVICIO,
        self::EN_MANTENIMIENTO,
        self::BAJA,
        self::RETIRADA,
    ];

    /** @var list<string> */
    public const ESTADOS_ENERGIA = [self::ENCENDIDA, self::APAGADA, self::SIN_ENERGIA];

    /** @var array<string, list<string>> */
    private const TRANSICIONES = [
        self::PLANEADA => [self::INSTALADA, self::BAJA],
        self::INSTALADA => [self::EN_SERVICIO, self::EN_MANTENIMIENTO, self::BAJA],
        self::EN_SERVICIO => [self::SUSPENDIDA, self::FUERA_DE_SERVICIO, self::EN_MANTENIMIENTO, self::BAJA, self::RETIRADA],
        self::SUSPENDIDA => [self::EN_SERVICIO, self::FUERA_DE_SERVICIO, self::BAJA, self::RETIRADA],
        self::FUERA_DE_SERVICIO => [self::EN_SERVICIO, self::EN_MANTENIMIENTO, self::BAJA, self::RETIRADA],
        self::EN_MANTENIMIENTO => [self::EN_SERVICIO, self::FUERA_DE_SERVICIO, self::BAJA],
        self::BAJA => [self::EN_SERVICIO, self::RETIRADA],
        self::RETIRADA => [self::EN_SERVICIO],
    ];

    public static function puede(string $desde, string $hasta): bool
    {
        if ($desde === $hasta) {
            return true;
        }

        return in_array($hasta, self::TRANSICIONES[$desde] ?? [], true);
    }

    /** @return list<string> */
    public static function destinos(string $desde): array
    {
        return self::TRANSICIONES[$desde] ?? [];
    }

    /** Estado terminal: la celda sigue en BD por razones históricas. */
    public static function esTerminal(string $estado): bool
    {
        return in_array($estado, [self::BAJA, self::RETIRADA], true);
    }

    /** La reactivación de una celda de baja/retirada exige Jefatura. */
    public static function requiereJefatura(string $desde, string $hasta): bool
    {
        return self::esTerminal($desde) && $hasta === self::EN_SERVICIO;
    }

    /** Una celda encendida debe estar en servicio; sin energía es no operativa. */
    public static function energiaValida(string $estado, string $energia): bool
    {
        if (! in_array($energia, self::ESTADOS_ENERGIA, true)) {
            return false;
        }
        if ($energia === self::ENCENDIDA) {
            return $estado === self::EN_SERVICIO;
        }
        if ($energia === self::SIN_ENERGIA) {
            return $estado !== self::EN_SERVICIO;
        }

        return $estado !== self::EN_SERVICIO;
    }
}
