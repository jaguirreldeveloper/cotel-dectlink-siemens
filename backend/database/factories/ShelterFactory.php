<?php

namespace Database\Factories;

use App\Models\Shelter;
use App\Models\Subcentral;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Shelter>
 */
class ShelterFactory extends Factory
{
    protected $model = Shelter::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'codigo' => 'SHE-'.fake()->unique()->bothify('##'),
            'nombre' => 'Shelter '.fake()->lastName(),
            'id_subcentral' => Subcentral::factory(),
            'kva_rectificador' => fake()->randomFloat(2, 1, 10),
            'autonomia_baterias_horas' => fake()->numberBetween(1, 12),
            'estado_clima' => 'AIRE',
            'activo' => true,
        ];
    }
}
