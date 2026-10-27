<?php

namespace Database\Factories;

use App\Models\Operador;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Operador>
 */
class OperadorFactory extends Factory
{
    protected $model = Operador::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password',
            'nombre' => fake()->name(),
            'role' => Operador::ROLE_TECNICO,
            'activo' => true,
        ];
    }

    /**
     * Operador SUPERADMIN (control total: gestión de usuarios, consola SQL, etc.).
     */
    public function superadmin(): static
    {
        return $this->state(fn (): array => ['role' => Operador::ROLE_SUPERADMIN]);
    }

    /**
     * Alias histórico: equivale a SUPERADMIN. Se conserva para compatibilidad
     * con pruebas y código que use `->admin()`.
     */
    public function admin(): static
    {
        return $this->superadmin();
    }

    public function supervisor(): static
    {
        return $this->state(fn (): array => ['role' => Operador::ROLE_SUPERVISOR]);
    }

    public function despachador(): static
    {
        return $this->state(fn (): array => ['role' => Operador::ROLE_DESPACHADOR]);
    }

    public function tecnico(): static
    {
        return $this->state(fn (): array => ['role' => Operador::ROLE_TECNICO]);
    }

    public function auditor(): static
    {
        return $this->state(fn (): array => ['role' => Operador::ROLE_AUDITOR]);
    }
}
