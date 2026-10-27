<?php

namespace App\Http\Controllers\Api;

use App\Models\Shelter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

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

    #[\Override]
    #[OA\Get(path: '/api/shelters', tags: ['Infraestructura'], summary: 'Directorio de shelters')]
    #[OA\Response(response: 200, description: 'Listado', content: new OA\JsonContent(type: 'array', items: new OA\Items(type: 'object')))]
    public function index(): JsonResponse
    {
        return parent::index();
    }

    #[\Override]
    #[OA\Post(path: '/api/shelters', tags: ['Infraestructura'], summary: 'Crear shelter (SUPERADMIN/ADMIN)')]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(required: ['codigo', 'nombre', 'id_subcentral'], properties: [
        new OA\Property(property: 'id_subcentral', type: 'integer'),
        new OA\Property(property: 'kva_rectificador', type: 'number', nullable: true),
        new OA\Property(property: 'autonomia_baterias_horas', type: 'integer', nullable: true),
        new OA\Property(property: 'estado_clima', type: 'string'),
    ]))]
    #[OA\Response(response: 201, description: 'Shelter creado')]
    #[OA\Response(response: 422, description: 'Validación fallida')]
    public function store(Request $request): JsonResponse
    {
        return parent::store($request);
    }

    #[\Override]
    #[OA\Patch(path: '/api/shelters/{shelter}', tags: ['Infraestructura'], summary: 'Editar shelter (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'shelter', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Shelter actualizado')]
    public function update(Request $request, int $id): JsonResponse
    {
        return parent::update($request, $id);
    }

    #[\Override]
    #[OA\Post(path: '/api/shelters/{shelter}/deactivate', tags: ['Infraestructura'], summary: 'Desactivar shelter (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'shelter', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Shelter desactivado')]
    public function deactivate(Request $request, int $id): JsonResponse
    {
        return parent::deactivate($request, $id);
    }

    #[\Override]
    #[OA\Delete(path: '/api/shelters/{shelter}', tags: ['Infraestructura'], summary: 'Eliminar shelter (solo SUPERADMIN)')]
    #[OA\Parameter(name: 'shelter', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Shelter eliminado')]
    #[OA\Response(response: 403, description: 'Rol sin permiso')]
    public function destroy(Request $request, int $id): JsonResponse
    {
        return parent::destroy($request, $id);
    }
}
