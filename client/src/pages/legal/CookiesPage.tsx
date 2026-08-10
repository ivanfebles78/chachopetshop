import { LegalLayout, LegalSection } from '@/components/LegalLayout';

export function CookiesPage() {
  return (
    <LegalLayout title="Política de cookies" updated="[fecha]">
      <LegalSection title="1. ¿Qué son las cookies?">
        <p>
          Las cookies son pequeños archivos que se almacenan en tu dispositivo al navegar. Sirven para
          recordar tus preferencias y mejorar tu experiencia (por ejemplo, mantener el contenido de tu
          carrito).
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies que utilizamos">
        <ul className="list-inside list-disc space-y-1">
          <li><strong>Técnicas (necesarias):</strong> imprescindibles para el funcionamiento del sitio, como la sesión de usuario y el carrito de la compra.</li>
          <li><strong>Preferencias:</strong> recuerdan tus ajustes.</li>
          <li><strong>Analíticas (opcionales):</strong> nos ayudan a entender cómo se usa la web. [Indica aquí tu proveedor si usas alguno, p. ej. Google Analytics.]</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Gestión y desactivación">
        <p>
          Puedes configurar o rechazar las cookies desde el aviso que aparece al entrar y desde los
          ajustes de tu navegador. Ten en cuenta que desactivar las cookies técnicas puede afectar al
          funcionamiento del sitio.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
