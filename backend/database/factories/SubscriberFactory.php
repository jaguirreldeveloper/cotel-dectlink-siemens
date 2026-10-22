<?php

namespace Database\Factories;

use App\Models\Cell;
use App\Models\Client;
use App\Models\Subscriber;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Subscriber>
 */
class SubscriberFactory extends Factory
{
    private static int $secuencia = 1000;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nro' => ++self::$secuencia,
            'numero_telefono' => fake()->unique()->numerify('288#####'),
            'codigo_area' => 'EAI',
            'contrato' => fake()->unique()->numberBetween(80000000, 89999999),
            'id_cliente' => Client::factory(),
            'id_celda' => Cell::factory(),
            'estado_servicio' => 'C/SERV.',
            'estado_operativo' => 'C/SERV.',
        ];
    }

    /**
     * Línea fuera de servicio con la señal ya apagada.
     */
    public function sinServicio(): static
    {
        return $this->state([
            'estado_servicio' => 'S/SERV.',
            'estado_operativo' => 'S/SERV.',
            'signal_dect' => null,
        ]);
    }
}
