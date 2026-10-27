<?php

namespace App\Http\Controllers\Api;

use App\Models\Armario;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/**
 * CRUD de armarios (gabinetes bajo shelters, según arquitectura COTEL).
 */
class ArmariosController extends InfraestructuraBaseController
{
    /**
     * @return array<string, mixed>
     */
    #[\Override]
    protected function serializar(Model $model): array
    {
        /** @var Armario $model */
        return [
            'id' => $model->id,
            'codigo' => $model->codigo,
            'nombre' => $model->nombre,
            'idShelter' => $model->id_shelter,
            'shelter' => $model->shelter?->nombre,
            'tipo' => $model->tipo,
            'ubicacion' => $model->ubicacion,
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
        return Armario::class;
    }

    #[\Override]
    protected function nombreTabla(): string
    {
        return 'armarios';
    }

    #[\Override]
    protected function etiqueta(): string
    {
        return 'Armario';
    }

    #[\Override]
    protected function paramRuta(): string
    {
        return 'armario';
    }

    /**
     * @return array<string, mixed>
     */
    #[\Override]
    protected function reglas(bool $soloOpcionales, int $idActual = 0): array
    {
        return $this->obligatorios([
            'codigo' => [Rule::unique('armarios', 'codigo')->ignore($idActual), 'string', 'max:50'],
            'nombre' => ['string', 'max:255'],
            'id_shelter' => ['integer', Rule::exists('shelters', 'id')],
            'tipo' => ['string', Rule::in(Armario::TIPO_RFP, Armario::TIPO_DISTRIBUCION, Armario::TIPO_PROTECCION, Armario::TIPO_EMPALMES, Armario::TIPO_OTRO)],
            'ubicacion' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'observacion' => ['nullable', 'string'],
            'activo' => ['nullable', 'boolean'],
        ], ['codigo', 'nombre', 'id_shelter'], $soloOpcionales);
    }
}
