<?php

namespace App\Http\Controllers\Api;

use App\Models\Subcentral;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/**
 * CRUD de subcentrales (centrales hijas / remotas).
 */
class SubcentralesController extends InfraestructuraBaseController
{
    /**
     * @return array<string, mixed>
     */
    #[\Override]
    protected function serializar(Model $model): array
    {
        /** @var Subcentral $model */
        return [
            'id' => $model->id,
            'codigo' => $model->codigo,
            'nombre' => $model->nombre,
            'idCentral' => $model->id_central,
            'central' => $model->central?->nombre,
            'modoEnlace' => $model->modo_enlace,
            'distanciaKm' => $model->distancia_km,
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
        return Subcentral::class;
    }

    #[\Override]
    protected function nombreTabla(): string
    {
        return 'subcentrales';
    }

    #[\Override]
    protected function etiqueta(): string
    {
        return 'Subcentral';
    }

    #[\Override]
    protected function paramRuta(): string
    {
        return 'subcentral';
    }

    /**
     * @return array<string, mixed>
     */
    #[\Override]
    protected function reglas(bool $soloOpcionales, int $idActual = 0): array
    {
        return $this->obligatorios([
            'codigo' => [Rule::unique('subcentrales', 'codigo')->ignore($idActual), 'string', 'max:50'],
            'nombre' => ['string', 'max:255'],
            'id_central' => ['integer', Rule::exists('centrales', 'id')],
            'modo_enlace' => ['string', Rule::in(['FIBRA', 'PAR_CU', 'RADIO', 'ENLACE_MICROONDAS'])],
            'distancia_km' => ['nullable', 'numeric'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'observacion' => ['nullable', 'string'],
            'activo' => ['nullable', 'boolean'],
        ], ['codigo', 'nombre', 'id_central'], $soloOpcionales);
    }
}
