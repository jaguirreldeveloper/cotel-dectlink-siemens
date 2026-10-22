<?php

namespace Database\Factories;

use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkOrder>
 */
class WorkOrderFactory extends Factory
{
    private static int $secuencia = 0;

    /**
     * Define the model's default state. Las fechas no se declaran: las
     * columnas tienen DEFAULT en la BD (el modelo no usa timestamps).
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => (string) fake()->uuid(),
            'codigo' => sprintf('OT-TEST-%04d', ++self::$secuencia),
            'titulo' => strtoupper(fake()->sentence(4)),
            'descripcion' => fake()->sentence(10),
            'tipo_trabajo' => 'REUBICACION_ANTENA',
            'prioridad' => 'MEDIA',
            'estado' => 'PENDIENTE',
            'fecha_creacion' => now(),
            'fecha_actualizacion' => now(),
        ];
    }

    /**
     * Orden ya finalizada con su fecha de cierre.
     */
    public function completada(): static
    {
        return $this->state([
            'estado' => 'COMPLETADO',
            'fecha_cierre' => now(),
        ]);
    }
}
