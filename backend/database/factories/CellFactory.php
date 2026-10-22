<?php

namespace Database\Factories;

use App\Models\Cell;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Cell>
 */
class CellFactory extends Factory
{
    private static int $rfp = 100;

    /**
     * Define the model's default state. La PK `id` es el número de RFP
     * y no es autoincremental, así que se asigna aquí.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $id = self::$rfp += 10;

        return [
            'id' => $id,
            'nombre' => "CELDA RFP {$id}",
            'tecnologia' => 'DECT-Link',
            'rfp_modelo' => 'Siemens C500',
            'banda_frecuencia' => '1880 - 1900 MHz (DECT GAP)',
            'capacidad_canales' => 4,
            'radio_cobertura_km' => 1.5,
            'latitud' => -16.5,
            'longitud' => -68.1,
        ];
    }
}
