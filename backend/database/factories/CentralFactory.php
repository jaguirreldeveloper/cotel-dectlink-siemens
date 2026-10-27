<?php

namespace Database\Factories;

use App\Models\Central;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Central>
 */
class CentralFactory extends Factory
{
    protected $model = Central::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'codigo' => 'CEN-'.fake()->unique()->bothify('##??'),
            'nombre' => 'Central '.fake()->lastName(),
            'direccion' => fake()->streetAddress(),
            'activo' => true,
        ];
    }
}
