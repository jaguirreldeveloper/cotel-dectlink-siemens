<?php

namespace App\Models;

use Database\Factories\ZoneFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Barrio / urbanización normalizado del padrón.
 *
 * @property int $id
 * @property string $nombre
 */
#[Fillable(['nombre'])]
class Zone extends Model
{
    /** @use HasFactory<ZoneFactory> */
    use HasFactory;

    protected $table = 'zonas';

    public const UPDATED_AT = null;

    /**
     * @return HasMany<Client, $this>
     */
    public function clientes(): HasMany
    {
        return $this->hasMany(Client::class, 'id_zona');
    }
}
