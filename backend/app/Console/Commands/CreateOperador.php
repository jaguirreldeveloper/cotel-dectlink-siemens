<?php

namespace App\Console\Commands;

use App\Models\Operador;
use Illuminate\Console\Command;

/**
 * Crea (o actualiza) un operador de la aplicación para iniciar sesión.
 *
 * Uso:
 *   php artisan operador:create                       # interactivo
 *   php artisan operador:create admin@cotel.bo --role=ADMIN --password=...
 *
 * El email se normaliza a minúsculas; la contraseña se hashea (cast 'hashed').
 */
class CreateOperador extends Command
{
    protected $signature = 'operador:create
        {email? : Correo con el que iniciará sesión}
        {--role= : Rol jerárquico (SUPERADMIN, SUPERVISOR, DESPACHADOR, TECNICO o AUDITOR; por defecto TECNICO)}
        {--nombre= : Nombre visible}
        {--password= : Contraseña (si se omite se pide de forma segura)}';

    protected $description = 'Crea (o actualiza) un operador de la aplicación con su contraseña';

    public function handle(): int
    {
        $email = strtolower(trim((string) ($this->argument('email') ?? $this->ask('Email del operador'))));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Email inválido.');

            return self::FAILURE;
        }

        $role = strtoupper((string) ($this->option('role') ?? Operador::ROLE_TECNICO));
        if (! in_array($role, Operador::ROLES, true)) {
            $this->error('Rol inválido: use uno de ' . implode(', ', Operador::ROLES) . '.');

            return self::FAILURE;
        }

        $nombre = trim((string) ($this->option('nombre') ?? $this->ask('Nombre visible (Enter para omitir)')));
        $nombre = $nombre !== '' ? $nombre : null;

        $password = (string) $this->option('password');
        if ($password === '') {
            $password = (string) $this->secret('Contraseña');
            if ($password !== (string) $this->secret('Confirma la contraseña')) {
                $this->error('Las contraseñas no coinciden.');

                return self::FAILURE;
            }
        }
        if (strlen($password) < 8) {
            $this->error('La contraseña debe tener al menos 8 caracteres.');

            return self::FAILURE;
        }

        $existente = Operador::query()->whereRaw('lower(email) = ?', [$email])->first();

        if ($existente !== null) {
            if (! $this->confirm("Ya existe un operador con ese email ({$email}). ¿Actualizarlo?")) {
                $this->warn('Cancelado: no se modificó nada.');

                return self::SUCCESS;
            }

            $existente->update([
                'password' => $password,
                'role' => $role,
                'nombre' => $nombre ?? $existente->nombre,
                'activo' => true,
            ]);
            $this->info("Operador #{$existente->id} actualizado: {$email} (rol {$role}).");

            return self::SUCCESS;
        }

        $operador = Operador::create([
            'email' => $email,
            'password' => $password,
            'nombre' => $nombre,
            'role' => $role,
            'activo' => true,
        ]);
        $this->info("Operador #{$operador->id} creado: {$email} (rol {$role}).");

        return self::SUCCESS;
    }
}
