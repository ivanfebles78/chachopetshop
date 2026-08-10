import { LegalLayout, LegalSection } from '@/components/LegalLayout';

export function CondicionesPage() {
  return (
    <LegalLayout title="Condiciones de compra" updated="[fecha]">
      <LegalSection title="1. Precios">
        <p>
          Todos los precios se muestran en euros (€) e incluyen los impuestos aplicables (IGIC en
          Canarias). Los gastos de envío se indican antes de finalizar la compra.
        </p>
      </LegalSection>

      <LegalSection title="2. Pedidos">
        <p>
          Para realizar un pedido, añade los productos al carrito y sigue el proceso de compra. Recibirás
          una confirmación por email. Nos reservamos el derecho de anular pedidos por falta de stock o
          errores manifiestos en el precio.
        </p>
      </LegalSection>

      <LegalSection title="3. Pago">
        <p>
          Aceptamos los métodos de pago indicados en el checkout. El pago se procesa de forma segura a
          través de nuestra pasarela [proveedor de pago]. No almacenamos los datos de tu tarjeta.
        </p>
      </LegalSection>

      <LegalSection title="4. Envío">
        <p>
          Realizamos envíos a [zona de reparto] en un plazo aproximado de 24-48 horas laborables. El
          envío es gratuito a partir de 49 € de compra; por debajo, se aplica una tarifa de [importe] €.
        </p>
      </LegalSection>

      <LegalSection title="5. Devoluciones y desistimiento">
        <p>
          Dispones de 14 días naturales desde la recepción para desistir de tu compra, salvo excepciones
          legales (productos perecederos o abiertos). Escríbenos a <strong>[email]</strong> para
          gestionar la devolución.
        </p>
      </LegalSection>

      <LegalSection title="6. Garantía y atención al cliente">
        <p>
          Los productos cuentan con la garantía legal aplicable. Para cualquier incidencia, contáctanos
          en <strong>[email]</strong> o en el <strong>[teléfono]</strong>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
