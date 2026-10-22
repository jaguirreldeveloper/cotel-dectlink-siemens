<?php

namespace Database\Factories;

use App\Models\Crew;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Crew>
 */
class CrewFactory extends Factory
{
    private static int $secuencia = 0;

    /**
     * Define the model's default state. La PK `id` es un slug del nombre.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        self::$secuencia++;
        $nombre = 'Cuadrilla Test '.self::$secuencia;

        return [
            'id' => 'cuadrilla-test-'.self::$secuencia,
            'nombre' => $nombre,
            'integrantes' => '{OPERADOR UNO,OPERADOR DOS}',
            'estado' => 'DISPONIBLE',
        ];
    }
}
