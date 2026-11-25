<?php

namespace Database\Seeders;

use App\Models\Operador;
use App\Models\PortalAbonado;
use App\Models\Subscriber;
use App\Models\Zone;
use Illuminate\Database\Seeder;

/**
 * Doce operadores de prueba, uno por responsabilidad del sistema (incluye los
 * tres roles nuevos y los cinco códigos de gerencia), más un acceso demo del
 * portal del abonado. Idempotente: se puede ejecutar las veces que haga falta.
 *
 * No modifica las cuentas históricas testadmin@ / testsuperadmin@.
 */
class RolesDemoSeeder extends Seeder
{
    private const PASSWORD = 'TestPass123!';

    /**
     * @var array<int, array{email: string, nombre: string, role: string, puesto: string, especialidad: string, area: string|null, departamento?: string, zona: string|null, turno: string, supervisor: string|null, extra?: list<string>, denegados?: list<string>}>
     */
    private const CUENTAS = [
        ['email' => 'desarrollo@cotel.bo', 'nombre' => 'Desarrollo de Sistemas', 'role' => Operador::ROLE_SUPERADMIN, 'puesto' => 'DESARROLLO', 'especialidad' => 'SISTEMAS', 'area' => 'GS', 'zona' => null, 'turno' => 'MANANA', 'supervisor' => null],
        ['email' => 'admin@cotel.bo', 'nombre' => 'Administración del Sistema', 'role' => Operador::ROLE_ADMIN, 'puesto' => 'ADMINISTRACION', 'especialidad' => 'RED', 'area' => null, 'zona' => null, 'turno' => 'MANANA', 'supervisor' => 'desarrollo@cotel.bo'],
        ['email' => 'auditor@cotel.bo', 'nombre' => 'Auditoría del Sistema', 'role' => Operador::ROLE_AUDITOR, 'puesto' => 'AUDITORIA', 'especialidad' => 'AUDITORIA', 'area' => null, 'zona' => null, 'turno' => 'MANANA', 'supervisor' => 'desarrollo@cotel.bo'],
        ['email' => 'gerente.gaf@cotel.bo', 'nombre' => 'Gerencia Administrativa Financiera', 'role' => Operador::ROLE_GERENTE_AREA, 'puesto' => 'GERENTE', 'especialidad' => 'FINANZAS', 'area' => 'GAF', 'zona' => null, 'turno' => 'MANANA', 'supervisor' => 'desarrollo@cotel.bo'],
        ['email' => 'gerente.gc@cotel.bo', 'nombre' => 'Gerencia Comercial', 'role' => Operador::ROLE_GERENTE_AREA, 'puesto' => 'GERENTE', 'especialidad' => 'COMERCIAL', 'area' => 'GC', 'zona' => null, 'turno' => 'MANANA', 'supervisor' => 'desarrollo@cotel.bo'],
        ['email' => 'gerente.gpp@cotel.bo', 'nombre' => 'Gerencia de Planta y Producción', 'role' => Operador::ROLE_GERENTE_AREA, 'puesto' => 'GERENTE', 'especialidad' => 'PLANTA', 'area' => 'GPP', 'zona' => null, 'turno' => 'TARDE', 'supervisor' => 'desarrollo@cotel.bo'],
        ['email' => 'gerente.gt@cotel.bo', 'nombre' => 'Gerencia Técnica', 'role' => Operador::ROLE_GERENTE_AREA, 'puesto' => 'GERENTE', 'especialidad' => 'RED', 'area' => 'GT', 'zona' => null, 'turno' => 'MANANA', 'supervisor' => 'desarrollo@cotel.bo'],
        ['email' => 'gerente.gs@cotel.bo', 'nombre' => 'Gerencia de Sistemas', 'role' => Operador::ROLE_GERENTE_AREA, 'puesto' => 'GERENTE', 'especialidad' => 'SISTEMAS', 'area' => 'GS', 'zona' => null, 'turno' => 'TARDE', 'supervisor' => 'desarrollo@cotel.bo'],
        ['email' => 'jefe.depto@cotel.bo', 'nombre' => 'Jefe de Departamento', 'role' => Operador::ROLE_JEFE_DEPARTAMENTO, 'puesto' => 'JEFE_DEPTO', 'especialidad' => 'OPERACIONES', 'area' => null, 'departamento' => 'EAI', 'zona' => null, 'turno' => 'MANANA', 'supervisor' => 'admin@cotel.bo'],
        ['email' => 'encargado.area@cotel.bo', 'nombre' => 'Encargado de Área', 'role' => Operador::ROLE_ENCARGADO_AREA, 'puesto' => 'ENCARGADO_AREA', 'especialidad' => 'OPERACIONES', 'area' => 'GPP', 'zona' => 'EL ALTO', 'turno' => 'TARDE', 'supervisor' => 'jefe.depto@cotel.bo'],
        ['email' => 'tecnico.campo@cotel.bo', 'nombre' => 'Técnico de Planta Externa', 'role' => Operador::ROLE_TECNICO, 'puesto' => 'TECNICO', 'especialidad' => 'CAMPO', 'area' => 'GT', 'zona' => 'EL ALTO', 'turno' => 'ROTATIVO', 'supervisor' => 'encargado.area@cotel.bo', 'extra' => ['work_orders.manage']],
        ['email' => 'despacho@cotel.bo', 'nombre' => 'Coordinación de Despacho', 'role' => Operador::ROLE_DESPACHADOR, 'puesto' => 'DESPACHO', 'especialidad' => 'DESPACHO', 'area' => 'GPP', 'zona' => null, 'turno' => 'NOCHE', 'supervisor' => 'jefe.depto@cotel.bo'],
    ];

    public function run(): void
    {
        foreach (self::CUENTAS as $cuenta) {
            $zonaId = $cuenta['zona'] !== null
                ? Zone::query()->where('nombre', $cuenta['zona'])->value('id') ?? Zone::query()->value('id')
                : null;

            Operador::query()->updateOrCreate(
                ['email' => $cuenta['email']],
                [
                    'password' => self::PASSWORD,
                    'nombre' => $cuenta['nombre'],
                    'role' => $cuenta['role'],
                    'activo' => true,
                    'puesto' => $cuenta['puesto'],
                    'especialidad' => $cuenta['especialidad'],
                    'area' => $cuenta['area'],
                    'departamento' => $cuenta['departamento'] ?? null,
                    'zona_id' => $zonaId,
                    'turno' => $cuenta['turno'],
                    'permisos_extra' => $cuenta['extra'] ?? [],
                    'permisos_denegados' => $cuenta['denegados'] ?? [],
                ]
            );
        }

        // Cadena de mando: dos pasadas para que el supervisor ya exista.
        foreach (self::CUENTAS as $cuenta) {
            if ($cuenta['supervisor'] === null) {
                continue;
            }
            $supervisorId = Operador::query()->where('email', $cuenta['supervisor'])->value('id');
            Operador::query()->where('email', $cuenta['email'])->update(['supervisor_id' => $supervisorId]);
        }

        $lineaDemo = Subscriber::query()->first();
        if ($lineaDemo !== null) {
            PortalAbonado::query()->updateOrCreate(
                ['abonado_nro' => $lineaDemo->nro],
                [
                    'metodo' => 'ADMIN',
                    'token_hash' => hash('sha256', 'demo-token-mi-linea'),
                    'expira_en' => null,
                    'activo' => true,
                    'intentos' => 0,
                ]
            );
        }
    }
}
