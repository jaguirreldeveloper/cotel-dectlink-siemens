<?php

namespace App\Http\Controllers\Api;

use App\Models\Shelter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/**
 * CRUD de shelters (casetas con rack, clima y baterías).
 */
class SheltersController extends InfraestructuraBaseController
{
    /**
     * @return array<string, mixed>
     */
    #[\Override]
    protected function serializar(Model $model): array
    {
        /** @var Shelter $model */
        return [
            'id' => $model->id,
            'codigo' => $model->codigo,
            'nombre' => $model->nombre,
            'idSubcentral' => $model->id_subcentral,
            'subcentral' => $model->subcentral?->nombre,
            'direccion' => $model->direccion,
            'kvaRectificador' => $model->kva_rectificador,
            'autonomiaBateriasHoras' => $model->autonomia_baterias_horas,
            'estadoClima' => $model->estado_clima ?? Shelter::CLIMA_AIRE,
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
        return Shelter::class;
    }

    #[\Override]
    protected function nombreTabla(): string
    {
        return 'shelters';
    }

    #[\Override]
    protected function etiqueta(): string
    {
        return 'Shelter';
    }

    #[\Override]
    protected function paramRuta(): string
    {
        return 'shelter';
    }

    /**
     * @return array<string, mixed>
     */
    #[\Override]
    protected function reglas(bool $soloOpcionales, int $idActual = 0): array
    {
        return $this->obligatorios([
            'codigo' => [Rule::unique('shelters', 'codigo')->ignore($idActual), 'string', 'max:50'],
            'nombre' => ['string', 'max:255'],
            'id_subcentral' => ['integer', Rule::exists('subcentrales', 'id')],
            'direccion' => ['nullable', 'string', 'max:255'],
            'kva_rectificador' => ['nullable', 'numeric', 'max:9999'],
            'autonomia_baterias_horas' => ['nullable', 'integer', 'max:9999'],
            'estado_clima' => ['string', Rule::in(Shelter::CLIMA_AIRE, Shelter::CLIMA_VENTILACION, Shelter::CLIMA_FUERA_SERVICIO)],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'observacion' => ['nullable', 'string'],
            'activo' => ['nullable', 'boolean'],
        ], ['codigo', 'nombre', 'id_subcentral'], $soloOpcionales);
    }
}
