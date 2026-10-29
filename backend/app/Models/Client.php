<?php

namespace App\Models;

use Database\Factories\ClientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Titular deduplicado del padrón (1 cliente → N líneas).
 *
 * @property int $id
 * @property string $nombre_completo
 * @property string|null $direccion
 * @property int|null $id_zona
 * @property-read Zone|null $zona
 */
#[Fillable(['nombre_completo', 'direccion', 'id_zona'])]
class Client extends Model
{
    /** @use HasFactory<ClientFactory> */
    use HasFactory;

    protected $table = 'clientes';

    public const UPDATED_AT = null;

    public function zona(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'id_zona');
    }

    /**
     * @return HasMany<Subscriber, $this>
     */
    public function lineas(): HasMany
    {
        return $this->hasMany(Subscriber::class, 'id_cliente');
    }
}
