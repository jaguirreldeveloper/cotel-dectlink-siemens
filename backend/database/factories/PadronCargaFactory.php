<?php

namespace Database\Factories;

use App\Models\PadronCarga;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PadronCarga>
 */
class PadronCargaFactory extends Factory
{
    protected $model = PadronCarga::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'archivo' => 'padron-'.fake()->date().'.csv',
            'total_filas' => 0,
            'nuevos' => 0,
            'actualizar' => 0,
            'sin_cambios' => 0,
            'rechazados' => 0,
            'la_paz' => 0,
            'el_alto' => 0,
            'sin_ciudad' => 0,
            'estado' => PadronCarga::ESTADO_PENDIENTE,
        ];
    }
}
