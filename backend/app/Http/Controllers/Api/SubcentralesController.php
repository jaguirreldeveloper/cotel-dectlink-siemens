<?php

namespace App\Http\Controllers\Api;

use App\Models\Subcentral;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

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

    #[\Override]
    #[OA\Get(path: '/api/subcentrales', tags: ['Infraestructura'], summary: 'Directorio de subcentrales')]
    #[OA\Response(response: 200, description: 'Listado', content: new OA\JsonContent(type: 'array', items: new OA\Items(type: 'object')))]
    public function index(): JsonResponse
    {
        return parent::index();
    }

    #[\Override]
    #[OA\Post(path: '/api/subcentrales', tags: ['Infraestructura'], summary: 'Crear subcentral (SUPERADMIN/ADMIN)')]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(required: ['codigo', 'nombre', 'id_central'], properties: [
        new OA\Property(property: 'id_central', type: 'integer'),
        new OA\Property(property: 'modoEnlace', type: 'string'),
    ]))]
    #[OA\Response(response: 201, description: 'Subcentral creada')]
    #[OA\Response(response: 422, description: 'Validación fallida')]
    public function store(Request $request): JsonResponse
    {
        return parent::store($request);
    }

    #[\Override]
    #[OA\Patch(path: '/api/subcentrales/{subcentral}', tags: ['Infraestructura'], summary: 'Editar subcentral (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'subcentral', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Subcentral actualizada')]
    public function update(Request $request, int $id): JsonResponse
    {
        return parent::update($request, $id);
    }

    #[\Override]
    #[OA\Post(path: '/api/subcentrales/{subcentral}/deactivate', tags: ['Infraestructura'], summary: 'Desactivar subcentral (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'subcentral', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Subcentral desactivada')]
    public function deactivate(Request $request, int $id): JsonResponse
    {
        return parent::deactivate($request, $id);
    }

    #[\Override]
    #[OA\Delete(path: '/api/subcentrales/{subcentral}', tags: ['Infraestructura'], summary: 'Eliminar subcentral (solo SUPERADMIN)')]
    #[OA\Parameter(name: 'subcentral', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Subcentral eliminada')]
    #[OA\Response(response: 403, description: 'Rol sin permiso')]
    public function destroy(Request $request, int $id): JsonResponse
    {
        return parent::destroy($request, $id);
    }
}
