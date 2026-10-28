<?php

namespace Database\Factories;

use App\Models\PadronCarga;
use App\Models\PadronCargaDetalle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PadronCargaDetalle>
 */
class PadronCargaDetalleFactory extends Factory
{
    protected $model = PadronCargaDetalle::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id_carga' => PadronCarga::factory(),
            'nro' => null,
            'numero' => fake()->numerify('288#####'),
            'nombre' => null,
            'accion' => PadronCarga::ACCION_RECHAZADO,
            'motivo' => null,
        ];
    }
}
