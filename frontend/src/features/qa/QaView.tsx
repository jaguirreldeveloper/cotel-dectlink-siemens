import { Compass } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { SectionHeader } from '@/shared/ui/SectionHeader';

// Quick Q&A tailored for Siemens DECTlink WLL
const quickQuestions = [
  {
    q: '¿Qué es el servicio Siemens DECTlink en COTEL?',
    a: 'Es una red de acceso inalámbrico fijo (WLL - Wireless Local Loop) que opera en la banda de 1880 a 1900 MHz (estándar DECT GAP). Utiliza estaciones base fijas (RFP Siemens) instaladas en nodos clave y terminales inalámbricos de abonado (FAU Siemens 200 y 300) en los techos/domicilios con antena para brindar telefonía fija en áreas periféricas de El Alto y Viacha donde el tendido de cobre era inviable.',
  },
  {
    q: '¿Por qué hay líneas "En Depósito"?',
    a: 'De acuerdo al estatuto y reglamento de COTEL R.L., los socios que viajan, realizan construcciones o no habitan temporalmente su predio pueden congelar voluntariamente su línea en "Depósito". Esto les permite mantener la titularidad de su certificado de aportación sin generar cargos mensuales de consumo básico, reservando su número y su puerto en la central.',
  },
  {
    q: '¿Cómo se manejan los cortes por mora y fallas técnicas?',
    a: 'Las líneas en "Corte por Mora" mantienen el enlace de radio DECT sincronizado con la estación base, pero tienen suspendido el tráfico saliente o total por facturas impagas. Por el contrario, las "Fallas Técnicas" corresponden a desalineación física de la antena por vientos del altiplano, avería de la fuente de alimentación de la FAU o bloqueo electrónico del módulo Siemens, requiriendo cuadrilla en sitio.',
  },
  {
    q: '¿Cuáles son las celdas DECT que componen el sistema en El Alto y Viacha?',
    a: 'El sistema integra la Celda 17 (Estación Base Tilata - Viacha, con la mayor carga), Celda 15 (Estación Base Senkata), Celda 12 (Viacha Centro / Plaza Ballivián), Celda 14 (Puchukollo / Laja), Celda 16 (Mariscal Santa Cruz / Río Seco) y Celda 11 (16 de Julio / Ballivián).',
  },
  {
    q: '¿Qué clientes corporativos operan sobre este enlace DECTlink?',
    a: 'Sobresalen instalaciones críticas como la Planta de Tratamiento de Aguas Residuales Puchukollo de EPSAS, agencias de Banco Sol y Banco FIE, la planta de alimentos TECALIM S.A. en San Salvador, CARSA S.R.L., el Hospital Distrital de Viacha y dependencias municipales del Gobierno Autónomo Municipal de Viacha.',
  },
];

/** Base de conocimiento: consultas frecuentes de la operación DECTlink. */
export function QaView() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader
          icon={Compass}
          eyebrow="Base de Conocimiento · Telefonía Inalámbrica WLL Siemens DECTlink"
          title="Guía Rápida de Respuestas Técnicas y Operativas de COTEL"
          description="Respuestas especializadas sobre la infraestructura de radio DECTlink, estaciones base RFP, unidades de abonado FAU, gestión de depósitos y morosidad."
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickQuestions.map((item, idx) => (
          <Card key={idx}>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-start gap-2 mb-2">
              <span className="text-brand-500 font-mono">Q{idx + 1}.</span>
              <span>{item.q}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-5">
              {item.a}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
