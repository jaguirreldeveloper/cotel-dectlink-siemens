<?php

namespace Database\Factories;

use App\Models\Bitacora;
use App\Models\Subscriber;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Bitacora>
 */
class BitacoraFactory extends Factory
{
    /**
     * Define the model's default state. El `timestamp` usa el DEFAULT de
     * la columna (now por fila).
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'abonado_nro' => Subscriber::factory(),
            'estado_anterior' => 'C/SERV.',
            'nuevo_estado' => 'C/SERV.',
            'detalle' => fake()->sentence(6),
            'tecnico' => 'Operador Sistema',
        ];
    }
}
