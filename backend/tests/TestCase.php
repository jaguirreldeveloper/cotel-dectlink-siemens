<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Las lecturas de la API exigen sesión de operador. En los tests de
     * contrato se usa el token de servidor (CLI) por defecto; los tests de
     * seguridad hacen `flushHeaders()` para probar el 401.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('x-admin-token', (string) config('cotel.admin_token'));
    }
}
