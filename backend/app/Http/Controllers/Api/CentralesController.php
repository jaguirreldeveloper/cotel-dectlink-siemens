<?php

namespace App\Http\Controllers\Api;

use App\Models\Central;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/**
 * CRUD de centrales telefónicas (madres) de planta externa.
 */
class CentralesController extends InfraestructuraBaseController
{
    /**
     * @return array<string, mixed>
     */
    #[\Override]
    protected function serializar(Model $model): array
    {
        /** @var Central $model */
        return [
            'id' => $model->id,
            'codigo' => $model->codigo,
            'nombre' => $model->nombre,
            'direccion' => $model->direccion,
            'lat' => $model->lat,
            'lng' => $model->lng,
            'observacion' => $model->observacion,
            'activo' => (bool) ($model->activo ?? true),
            'createdAt' => $model->created_at?->toISOString(),
            'updatedAt' => $model->updated_at?->toISOString(),
        ];
    }

    #[\Override]
    protected function modelo(): string
    {
        return Central::class;
    }

    #[\Override]
    protected function nombreTabla(): string
    {
        return 'centrales';
    }

    #[\Override]
    protected function etiqueta(): string
    {
        return 'Central';
    }

    #[\Override]
    protected function paramRuta(): string
    {
        return 'central';
    }

    /**
     * @return array<string, mixed>
     */
    #[\Override]
    protected function reglas(bool $soloOpcionales, int $idActual = 0): array
    {
        return $this->obligatorios([
            'codigo' => [Rule::unique('centrales', 'codigo')->ignore($idActual), 'string', 'max:50'],
            'nombre' => ['string', 'max:255'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'observacion' => ['nullable', 'string'],
            'activo' => ['nullable', 'boolean'],
        ], ['codigo', 'nombre'], $soloOpcionales);
    }
}
