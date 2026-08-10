import { LegalLayout, LegalSection } from '@/components/LegalLayout';

export function AvisoLegalPage() {
  return (
    <LegalLayout title="Aviso legal" updated="[fecha]">
      <LegalSection title="1. Datos identificativos">
        <p>
          En cumplimiento de la Ley 34/2002 de Servicios de la Sociedad de la Información y Comercio
          Electrónico (LSSI-CE), se informa de que este sitio web es titularidad de:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>Titular: <strong>[Nombre fiscal / titular]</strong></li>
          <li>NIF/CIF: <strong>[NIF/CIF]</strong></li>
          <li>Domicilio: <strong>[Dirección fiscal completa]</strong></li>
          <li>Email de contacto: <strong>[email]</strong></li>
          <li>Teléfono: <strong>[teléfono]</strong></li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Objeto">
        <p>
          El presente aviso legal regula el uso del sitio web de Chacho Pet Shop, dedicado a la venta
          de productos de nutrición y accesorios para mascotas. El acceso y navegación implican la
          aceptación de las condiciones aquí recogidas.
        </p>
      </LegalSection>

      <LegalSection title="3. Condiciones de uso">
        <p>
          El usuario se compromete a hacer un uso adecuado de los contenidos y a no emplearlos para
          incurrir en actividades ilícitas o contrarias a la buena fe. El titular podrá retirar el
          acceso a quienes incumplan estas condiciones.
        </p>
      </LegalSection>

      <LegalSection title="4. Propiedad intelectual e industrial">
        <p>
          Todos los contenidos del sitio (textos, imágenes, logotipos, diseño) son titularidad del
          responsable o de terceros que han autorizado su uso. Queda prohibida su reproducción sin
          autorización expresa.
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilidad">
        <p>
          El titular no se hace responsable de los daños derivados de un uso inadecuado del sitio ni
          de interrupciones ajenas a su control. Se reserva el derecho a modificar los contenidos sin
          previo aviso.
        </p>
      </LegalSection>

      <LegalSection title="6. Legislación aplicable">
        <p>
          Las presentes condiciones se rigen por la legislación española. Para la resolución de
          conflictos, las partes se someten a los juzgados y tribunales de [localidad].
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
