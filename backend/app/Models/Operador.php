<?php

namespace App\Models;

use Database\Factories\OperadorFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Operador: usuario real de la aplicación (login email/contraseña).
 *
 * Tabla propia `operadores`, separada de `users` (Supabase Auth) para no
 * mezclar ambos orígenes de identidad. El acceso lo da el guard de sesión
 * `web` (cookie); las escrituras se controlan por rol vía el middleware
 * `RequireRole` (alias `role`).
 *
 * Roles jerárquicos canónicos (nivel 1 = mayor privilegio):
 *   1. SUPERADMIN   · Jefatura Técnica & Sistemas (control total)
 *   2. SUPERVISOR   · Ingeniero de Red DECTlink & Regulación ATT
 *   3. DESPACHADOR  · Coordinador de Cuadrillas & Despacho de OTs
 *   4. TECNICO      · Técnico de Planta Externa & Instalador FAU
 *   5. AUDITOR      · Auditor Regulatorio ATT & Consulta Comercial
 *
 * Se conservan los alias ADMIN (= SUPERADMIN) y OPERADOR (= TECNICO) por
 * compatibilidad con datos históricos no normalizados; `rolCanonico()`
 * los traduce al nombre canónico antes de cualquier comparación de acceso.
 *
 * @property int $id
 * @property string $email
 * @property string|null $nombre
 * @property string $role
 * @property bool $activo
 */
#[Fillable(['email', 'password', 'nombre', 'role', 'activo'])]
#[Hidden(['password', 'remember_token'])]
class Operador extends Authenticatable
{
    /** @use HasFactory<OperadorFactory> */
    use HasFactory, Notifiable;

    // Roles jerárquicos canónicos (nivel 1 = mayor privilegio)
    public const ROLE_SUPERADMIN = 'SUPERADMIN';
    public const ROLE_SUPERVISOR = 'SUPERVISOR';
    public const ROLE_DESPACHADOR = 'DESPACHADOR';
    public const ROLE_TECNICO = 'TECNICO';
    public const ROLE_AUDITOR = 'AUDITOR';

    /** Alias históricos (el CHECK de la BD aún los acepta). */
    public const ROLE_ADMIN = 'ADMIN';
    public const ROLE_OPERADOR = 'OPERADOR';

    /** Lista canónica de roles en orden de privilegio. */
    public const ROLES = [
        self::ROLE_SUPERADMIN,
        self::ROLE_SUPERVISOR,
        self::ROLE_DESPACHADOR,
        self::ROLE_TECNICO,
        self::ROLE_AUDITOR,
    ];

    /** Nivel de privilegio por rol (1 = mayor). Los alias heredan el nivel. */
    private const NIVELES = [
        self::ROLE_SUPERADMIN => 1,
        self::ROLE_SUPERVISOR => 2,
        self::ROLE_DESPACHADOR => 3,
        self::ROLE_TECNICO => 4,
        self::ROLE_AUDITOR => 5,
        self::ROLE_ADMIN => 1,
        self::ROLE_OPERADOR => 4,
    ];

    /** Traducción de alias históricos al rol canónico. */
    private const ALIAS_CANONICO = [
        self::ROLE_ADMIN => self::ROLE_SUPERADMIN,
        self::ROLE_OPERADOR => self::ROLE_TECNICO,
    ];

    protected $table = 'operadores';

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'activo' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * Rol canónico del operador (traduce alias ADMIN/OPERADOR).
     */
    public function rolCanonico(): string
    {
        return self::ALIAS_CANONICO[$this->role] ?? $this->role;
    }

    /**
     * Nivel de privilegio (1 = mayor). Desconocido → 99.
     */
    public function nivel(): int
    {
        return self::NIVELES[$this->role] ?? 99;
    }

    /**
     * ¿Tiene al menos el privilegio del rol indicado (comparando niveles)?
     */
    public function esAlMenos(string $rol): bool
    {
        return $this->nivel() <= (self::NIVELES[$rol] ?? 99);
    }

    /**
     * ¿Es SUPERADMIN?
     */
    public function esSuperadmin(): bool
    {
        return $this->rolCanonico() === self::ROLE_SUPERADMIN;
    }

    /**
     * ¿Tiene acceso elevado (SUPERADMIN o SUPERVISOR)?
     *
     * Mantiene la semántica de "admin" para quien consulte esAdmin().
     */
    public function esAdmin(): bool
    {
        return $this->esAlMenos(self::ROLE_SUPERVISOR);
    }

    /**
     * ¿Puede despachar OTs/cuadrillas/materiales (DESPACHADOR o superior)?
     */
    public function puedeDespachar(): bool
    {
        return $this->esAlMenos(self::ROLE_DESPACHADOR);
    }
}
