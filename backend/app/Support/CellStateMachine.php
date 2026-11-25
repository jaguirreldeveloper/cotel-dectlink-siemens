<?php

namespace App\Support;

/**
 * Ciclo de vida de una celda RFP. Las transiciones están acotadas para que
 * el historial sea auditable: nunca se "borra" una celda por cambiar de estado.
 */
final class CellStateMachine
{
    public const PLANEADA = 'PLANEADA';

    public const INSTALADA = 'INSTALADA';

    public const EN_SERVICIO = 'EN_SERVICIO';

    public const SUSPENDIDA = 'SUSPENDIDA';

    public const BAJA = 'BAJA';

    public const RETIRADA = 'RETIRADA';

    /** @var list<string> */
    public const ESTADOS = [
        self::PLANEADA,
        self::INSTALADA,
        self::EN_SERVICIO,
        self::SUSPENDIDA,
        self::BAJA,
        self::RETIRADA,
    ];

    /** @var array<string, list<string>> */
    private const TRANSICIONES = [
        self::PLANEADA => [self::INSTALADA, self::BAJA],
        self::INSTALADA => [self::EN_SERVICIO, self::BAJA],
        self::EN_SERVICIO => [self::SUSPENDIDA, self::BAJA, self::RETIRADA],
        self::SUSPENDIDA => [self::EN_SERVICIO, self::BAJA, self::RETIRADA],
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

    /** La reactivación de una celda dada de baja/retirada exige Jefatura. */
    public static function requiereJefatura(string $desde, string $hasta): bool
    {
        return self::esTerminal($desde) && $hasta === self::EN_SERVICIO;
    }
}
