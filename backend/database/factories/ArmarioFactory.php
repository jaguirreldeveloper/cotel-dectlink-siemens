<?php

namespace Database\Factories;

use App\Models\Armario;
use App\Models\Shelter;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Armario>
 */
class ArmarioFactory extends Factory
{
    protected $model = Armario::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'codigo' => 'ARM-'.fake()->unique()->bothify('##'),
            'nombre' => 'Armario '.fake()->lastName(),
            'id_shelter' => Shelter::factory(),
            'tipo' => 'RFP',
            'activo' => true,
        ];
    }
}
