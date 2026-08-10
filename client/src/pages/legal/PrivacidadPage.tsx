import { LegalLayout, LegalSection } from '@/components/LegalLayout';

export function PrivacidadPage() {
  return (
    <LegalLayout title="Política de privacidad" updated="[fecha]">
      <LegalSection title="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de tus datos es <strong>[Nombre fiscal]</strong>, con NIF
          <strong> [NIF/CIF]</strong>, domicilio en <strong>[dirección]</strong> y email de contacto
          <strong> [email]</strong>.
        </p>
      </LegalSection>

      <LegalSection title="2. Datos que recogemos">
        <p>Tratamos los datos que nos facilitas voluntariamente a través de:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Formulario de contacto: nombre, email, asunto y mensaje.</li>
          <li>Registro y pedidos: nombre, email, dirección de envío y datos del pedido.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidad y legitimación">
        <p>
          Usamos tus datos para responder a tus consultas, gestionar tus pedidos y prestarte nuestros
          servicios. La base legal es tu consentimiento y la ejecución de la relación contractual.
        </p>
      </LegalSection>

      <LegalSection title="4. Conservación">
        <p>
          Conservamos tus datos mientras dure la relación y, después, durante los plazos legalmente
          exigidos. Los datos de contacto se conservan hasta que solicites su supresión.
        </p>
      </LegalSection>

      <LegalSection title="5. Destinatarios">
        <p>
          No cedemos tus datos a terceros salvo obligación legal o proveedores necesarios para prestar
          el servicio (pasarela de pago, transporte, alojamiento), que actúan como encargados del
          tratamiento.
        </p>
      </LegalSection>

      <LegalSection title="6. Tus derechos">
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y
          portabilidad escribiendo a <strong>[email]</strong>. También puedes reclamar ante la Agencia
          Española de Protección de Datos (www.aepd.es).
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
