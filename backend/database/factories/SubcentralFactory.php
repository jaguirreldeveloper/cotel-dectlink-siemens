<?php

namespace Database\Factories;

use App\Models\Central;
use App\Models\Subcentral;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Subcentral>
 */
class SubcentralFactory extends Factory
{
    protected $model = Subcentral::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'codigo' => 'SUB-'.fake()->unique()->bothify('##??'),
            'nombre' => 'Subcentral '.fake()->lastName(),
            'id_central' => Central::factory(),
            'modo_enlace' => 'FIBRA',
            'distancia_km' => fake()->randomFloat(2, 0.5, 25),
            'activo' => true,
        ];
    }
}
