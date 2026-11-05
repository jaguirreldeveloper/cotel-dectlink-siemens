<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * El shell del SPA se genera con `copy:dist` y no se versiona, así que la
     * prueba crea un `index.html` temporal cuando el build no está presente.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $index = public_path('index.html');
        $creado = ! is_file($index);

        if ($creado) {
            file_put_contents($index, '<!doctype html><html><body>COTEL</body></html>');
        }

        try {
            $response = $this->get('/');

            $response->assertStatus(200);
        } finally {
            if ($creado) {
                @unlink($index);
            }
        }
    }
}
