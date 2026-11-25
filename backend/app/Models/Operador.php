<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\OperadorFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
 *   1. SUPERADMIN   · Jefatura Técnica & Sistemas (implementa y controla todo)
 *   2. ADMIN        · Administración Operativa (administra lo implementado)
 *   3. SUPERVISOR   · Ingeniero de Red DECTlink & Regulación ATT
 *   4. DESPACHADOR  · Coordinador de Cuadrillas & Despacho de OTs
 *   5. TECNICO      · Técnico de Planta Externa & Instalador FAU
 *   6. AUDITOR      · Auditor Regulatorio ATT & Consulta Comercial
 *
 * Se conserva el alias OPERADOR (= TECNICO) por compatibilidad con datos
 * históricos no normalizados; `rolCanonico()` lo traduce al nombre canónico
 * antes de cualquier comparación de acceso. ADMIN ya es canónico (rol propio
 * de nivel 2) y NO hereda el nivel de SUPERADMIN.
 *
 * @property int $id
 * @property string $email
 * @property string|null $nombre
 * @property string $role
 * @property string|null $puesto
 * @property string|null $especialidad
 * @property string|null $area
 * @property string|null $departamento
 * @property int|null $zona_id
 * @property string|null $turno
 * @property int|null $supervisor_id
 * @property list<string> $permisos_extra
 * @property list<string> $permisos_denegados
 * @property bool $activo
 * @property string $password
 * @property string|null $remember_token
 * @property string|null $last_login_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 *
 * @method static \App\Models\Operador create(array<string, mixed> $attributes = [])
 */
#[Fillable([
    'email', 'password', 'nombre', 'role', 'activo',
    'puesto', 'especialidad', 'area', 'departamento', 'zona_id', 'turno', 'supervisor_id',
    'permisos_extra', 'permisos_denegados',
])]
#[Hidden(['password', 'remember_token'])]
class Operador extends Authenticatable
{
    /** @use HasFactory<OperadorFactory> */
    use HasFactory, Notifiable;

    // Roles jerárquicos canónicos (nivel 1 = mayor privilegio)
    public const ROLE_SUPERADMIN = 'SUPERADMIN';

    public const ROLE_ADMIN = 'ADMIN';

    public const ROLE_SUPERVISOR = 'SUPERVISOR';

    public const ROLE_DESPACHADOR = 'DESPACHADOR';

    public const ROLE_TECNICO = 'TECNICO';

    public const ROLE_AUDITOR = 'AUDITOR';

    /** Gerencia de área: KPIs y reportes de solo lectura (GAF/GC/GPP/GT/GS). */
    public const ROLE_GERENTE_AREA = 'GERENTE_AREA';

    /** Responsable de departamento: aprueba OTs y ve métricas del departamento. */
    public const ROLE_JEFE_DEPARTAMENTO = 'JEFE_DEPARTAMENTO';

    /** Responsable de área: gestiona cuadrillas y actividades de su área. */
    public const ROLE_ENCARGADO_AREA = 'ENCARGADO_AREA';

    /** Alias históricos (el CHECK de la BD aún los acepta). */
    public const ROLE_OPERADOR = 'OPERADOR';

    /** Lista canónica de roles en orden de privilegio. */
    public const ROLES = [
        self::ROLE_SUPERADMIN,
        self::ROLE_ADMIN,
        self::ROLE_SUPERVISOR,
        self::ROLE_DESPACHADOR,
        self::ROLE_TECNICO,
        self::ROLE_AUDITOR,
        self::ROLE_GERENTE_AREA,
        self::ROLE_JEFE_DEPARTAMENTO,
        self::ROLE_ENCARGADO_AREA,
    ];

    /**
     * Nivel organizacional (1 = mayor). No equivale a privilegios: la
     * autorización se resuelve por permisos, nunca por comparar niveles.
     */
    private const NIVELES = [
        self::ROLE_SUPERADMIN => 1,
        self::ROLE_ADMIN => 2,
        self::ROLE_GERENTE_AREA => 2,
        self::ROLE_JEFE_DEPARTAMENTO => 3,
        self::ROLE_SUPERVISOR => 3,
        self::ROLE_ENCARGADO_AREA => 4,
        self::ROLE_DESPACHADOR => 4,
        self::ROLE_TECNICO => 5,
        self::ROLE_AUDITOR => 6,
        self::ROLE_OPERADOR => 5,
    ];

    /** Traducción de alias históricos al rol canónico (ADMIN ya es canónico). */
    private const ALIAS_CANONICO = [
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
            'permisos_extra' => 'array',
            'permisos_denegados' => 'array',
        ];
    }

    /**
     * Rol canónico del operador (traduce el alias histórico OPERADOR).
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
     * ¿Es SUPERADMIN? (un ADMIN de nivel 2 no hereda este privilegio)
     */
    public function esSuperadmin(): bool
    {
        return $this->role === self::ROLE_SUPERADMIN;
    }

    /**
     * Rota el nonce de revocación de tokens (`remember_token`).
     *
     * Al cambiar el nonce, todos los tokens emitidos con el valor anterior
     * quedan inválidos de inmediato. Se usa en logout, restablecimiento de
     * contraseña y cualquier revocación de sesión del lado servidor.
     *
     * @return string El nuevo nonce (32 hex)
     */
    public function rotarNonceDeTokens(): string
    {
        $this->remember_token = bin2hex(random_bytes(16));
        $this->save();

        return (string) $this->remember_token;
    }

    /**
     * ¿Tiene acceso elevado (SUPERADMIN o SUPERVISOR)?
     *
     * Mantiene la semántica de "admin" para quien consulte esAdmin().
     */
    public function esAdmin(): bool
    {
        return in_array($this->rolCanonico(), [
            self::ROLE_SUPERADMIN,
            self::ROLE_ADMIN,
            self::ROLE_SUPERVISOR,
        ], true);
    }

    /**
     * ¿Puede despachar OTs/cuadrillas/materiales (DESPACHADOR o superior)?
     */
    public function puedeDespachar(): bool
    {
        return in_array($this->rolCanonico(), [
            self::ROLE_SUPERADMIN,
            self::ROLE_ADMIN,
            self::ROLE_SUPERVISOR,
            self::ROLE_DESPACHADOR,
            self::ROLE_JEFE_DEPARTAMENTO,
            self::ROLE_ENCARGADO_AREA,
        ], true);
    }

    /** Zona geográfica asignada (plantas externas). */
    public function zona(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'zona_id');
    }

    /** Operador al que reporta este usuario (cadena de mando). */
    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(self::class, 'supervisor_id');
    }

    /** Operadores a cargo de este usuario. */
    public function subordinados(): HasMany
    {
        return $this->hasMany(self::class, 'supervisor_id');
    }
}
