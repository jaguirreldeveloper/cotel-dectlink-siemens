<?php

namespace App\Http\Controllers\Api;

use App\Models\Armario;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

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

    #[\Override]
    #[OA\Get(path: '/api/armarios', tags: ['Infraestructura'], summary: 'Directorio de armarios')]
    #[OA\Response(response: 200, description: 'Listado', content: new OA\JsonContent(type: 'array', items: new OA\Items(type: 'object')))]
    public function index(): JsonResponse
    {
        return parent::index();
    }

    #[\Override]
    #[OA\Post(path: '/api/armarios', tags: ['Infraestructura'], summary: 'Crear armario (SUPERADMIN/ADMIN)')]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(required: ['codigo', 'nombre', 'id_shelter'], properties: [
        new OA\Property(property: 'id_shelter', type: 'integer'),
        new OA\Property(property: 'tipo', type: 'string'),
        new OA\Property(property: 'ubicacion', type: 'string', nullable: true),
    ]))]
    #[OA\Response(response: 201, description: 'Armario creado')]
    #[OA\Response(response: 422, description: 'Validación fallida')]
    public function store(Request $request): JsonResponse
    {
        return parent::store($request);
    }

    #[\Override]
    #[OA\Patch(path: '/api/armarios/{armario}', tags: ['Infraestructura'], summary: 'Editar armario (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'armario', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Armario actualizado')]
    public function update(Request $request, int $id): JsonResponse
    {
        return parent::update($request, $id);
    }

    #[\Override]
    #[OA\Post(path: '/api/armarios/{armario}/deactivate', tags: ['Infraestructura'], summary: 'Desactivar armario (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'armario', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Armario desactivado')]
    public function deactivate(Request $request, int $id): JsonResponse
    {
        return parent::deactivate($request, $id);
    }

    #[\Override]
    #[OA\Delete(path: '/api/armarios/{armario}', tags: ['Infraestructura'], summary: 'Eliminar armario (solo SUPERADMIN)')]
    #[OA\Parameter(name: 'armario', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Armario eliminado')]
    #[OA\Response(response: 403, description: 'Rol sin permiso')]
    public function destroy(Request $request, int $id): JsonResponse
    {
        return parent::destroy($request, $id);
    }
}
