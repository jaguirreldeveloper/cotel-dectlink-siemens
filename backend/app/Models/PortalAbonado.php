<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * Acceso del usuario final (abonado/cliente) al portal «Mi línea».
 *
 * El abonado NO es un operador: esta tabla guarda únicamente la credencial
 * (hash del token, método y vigencia). La autorización por fila se resuelve
 * siempre en backend con `abonado_nro`, nunca con un valor enviado por el cliente.
 *
 * @property int $id
 * @property int $abonado_nro
 * @property string $metodo
 * @property string|null $token_hash
 * @property CarbonImmutable|null $expira_en
 * @property bool $activo
 * @property int $intentos
 */
class PortalAbonado extends Model
{
    protected $table = 'portal_abonados';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'expira_en' => 'immutable_datetime',
            'ultimo_acceso' => 'immutable_datetime',
        ];
    }

    /** El token es válido solo si está activo, hasheado y no ha expirado. */
    public function tokenVigente(): bool
    {
        return $this->activo
            && $this->token_hash !== null
            && ($this->expira_en === null || $this->expira_en->isFuture());
    }
}
