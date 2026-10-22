<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nombre_completo' => strtoupper(fake()->name()),
            'direccion' => strtoupper(fake()->address()),
            'id_zona' => Zone::factory(),
        ];
    }
}
