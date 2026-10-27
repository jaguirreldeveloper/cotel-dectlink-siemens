<?php

namespace App\Http\Controllers\Api;

use App\Models\Central;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

/**
 * CRUD de centrales telefÃ³nicas (madres) de planta externa.
 *
 * @OA\Tag(name="Infraestructura", description="JerarquÃ­a Central â†’ Subcentral â†’ Shelter â†’ Armario y celdas (RFP)")
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

    /** Catalogo de centrales. */
    #[\Override]
    #[OA\Get(path: '/api/centrales', tags: ['Infraestructura'], summary: 'Directorio de centrales')]
    #[OA\Response(response: 200, description: 'Listado de centrales', content: new OA\JsonContent(type: 'array', items: new OA\Items(type: 'object')))]
    public function index(): JsonResponse
    {
        return parent::index();
    }

    /** Crear central. */
    #[\Override]
    #[OA\Post(path: '/api/centrales', tags: ['Infraestructura'], summary: 'Crear central (SUPERADMIN/ADMIN)')]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(required: ['codigo', 'nombre'], properties: [
        new OA\Property(property: 'codigo', type: 'string'),
        new OA\Property(property: 'nombre', type: 'string'),
        new OA\Property(property: 'direccion', type: 'string', nullable: true),
        new OA\Property(property: 'lat', type: 'number', nullable: true),
        new OA\Property(property: 'lng', type: 'number', nullable: true),
        new OA\Property(property: 'observacion', type: 'string', nullable: true),
    ]))]
    #[OA\Response(response: 201, description: 'Central creada')]
    #[OA\Response(response: 422, description: 'ValidaciÃ³n fallida')]
    public function store(Request $request): JsonResponse
    {
        return parent::store($request);
    }

    /** Editar central. */
    #[\Override]
    #[OA\Patch(path: '/api/centrales/{central}', tags: ['Infraestructura'], summary: 'Editar central (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'central', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Central actualizada')]
    public function update(Request $request, int $id): JsonResponse
    {
        return parent::update($request, $id);
    }

    /** Baja lÃ³gica de central (activo=false). */
    #[\Override]
    #[OA\Post(path: '/api/centrales/{central}/deactivate', tags: ['Infraestructura'], summary: 'Desactivar central (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'central', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Central desactivada')]
    public function deactivate(Request $request, int $id): JsonResponse
    {
        return parent::deactivate($request, $id);
    }

    /** Borrado fÃ­sico de central (exclusivo SUPERADMIN). */
    #[\Override]
    #[OA\Delete(path: '/api/centrales/{central}', tags: ['Infraestructura'], summary: 'Eliminar central (solo SUPERADMIN)')]
    #[OA\Parameter(name: 'central', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Central eliminada')]
    #[OA\Response(response: 403, description: 'Rol sin permiso')]
    public function destroy(Request $request, int $id): JsonResponse
    {
        return parent::destroy($request, $id);
    }
}
