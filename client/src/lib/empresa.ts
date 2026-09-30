/**
 * DATOS DE LA EMPRESA — EL ÚNICO SITIO DONDE SE CONFIGURAN.
 *
 * Todo lo que valga `null` NO SE PINTA en ninguna pantalla: ni en el pie, ni en
 * contacto, ni en la portada. No hay que tocar ningún componente, ni queda
 * ningún hueco descuadrado, ni aparece nada falso mientras tanto.
 *
 * Antes había aquí un teléfono de relleno («922 00 00 00»), una dirección
 * («Calle Ejemplo, 1»), un horario y un correo, los tres inventados y los tres
 * publicados. Ya no: lo que hay debajo es lo que Ivan ha confirmado, y lo que
 * no ha confirmado sigue en `null`.
 */
export const EMPRESA: {
  nombreComercial: string;
  telefono: string | null;
  telefonoE164: string | null;
  /** WhatsApp de la tienda, en formato internacional SIN el «+» (para wa.me). */
  whatsapp: string | null;
  email: string | null;
  direccion: string | null;
  /** Coordenadas de la tienda, para el mapa. `null` = sólo dirección de texto. */
  geo: { lat: number; lon: number } | null;
  horario: string | null;
  razonSocial: string | null;
  nif: string | null;
} = {
  nombreComercial: 'Chacho Pet Shop',
  telefono: '689 73 22 67',
  telefonoE164: '+34689732267',
  whatsapp: '34689732267',
  email: 'chachopetshop@gmail.com',

  direccion: 'C. San Francisco de Paula, 157, 38205 La Laguna, Tenerife',
  // Coordenadas EXACTAS del local (resueltas desde el enlace de Google que pasó
  // Ivan; su ficha de Google en ese punto figura como «Piensos El Campesino Los
  // Baldíos»). Con ellas el mapa del pie es OpenStreetMap con el pin justo ahí.
  geo: { lat: 28.4610576, lon: -16.3278474 },
  horario: 'Lunes a viernes: 9:00–13:00 y 16:00–19:00\nSábados: 9:00–14:00',

  /*
   * OBLIGATORIOS POR LA LSSI, Y SIGUEN SIN ESTAR.
   *
   * `razonSocial` no es lo mismo que el nombre comercial: la ley pide el nombre
   * del titular —persona física o sociedad—, que puede no ser «Chacho Pet
   * Shop». Poner el comercial en su hueco sería rellenarlo con algo que no se
   * ha confirmado, así que se deja marcado.
   *
   * El NIF está pendiente de que Ivan lo facilite. En cuanto los dos existan,
   * salen solos en el pie: el hueco ya está montado y probado.
   */
  razonSocial: null,   // TODO(Ivan): titular legal (puede no coincidir con el nombre comercial)
  nif: null,           // TODO(Ivan): NIF
};

/**
 * Perfiles sociales REALES. Vacío = no se pinta ningún icono.
 *
 * Estaban puestos con `href="#"` en el pie y en contacto: cuatro controles que
 * parecían pulsables y no llevaban a ninguna parte, y que un lector de pantalla
 * anunciaba como enlaces. Vuelven cuando existan los perfiles.
 */
export type RedSocial = { nombre: 'Instagram' | 'Facebook'; url: string };
export const REDES_SOCIALES: RedSocial[] = [
  // TODO(Ivan): { nombre: 'Instagram', url: 'https://instagram.com/…' },
];

/**
 * Enlace a un chat de WhatsApp con la tienda, con un mensaje ya escrito.
 *
 * Devuelve `null` si no hay número, para que quien lo use no pinte un botón que
 * no lleva a ninguna parte. El mensaje se codifica: sirve para prellenar «Hola,
 * me interesa el producto X» desde una ficha.
 */
export function enlaceWhatsApp(mensaje?: string): string | null {
  if (!EMPRESA.whatsapp) return null;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : '';
  return `https://wa.me/${EMPRESA.whatsapp}${texto}`;
}

/** Enlace `tel:` para llamar, o `null` si no hay número. */
export function enlaceTelefono(): string | null {
  return EMPRESA.telefonoE164 ? `tel:${EMPRESA.telefonoE164}` : null;
}

/** Las filas de contacto que hoy tienen valor, en orden de utilidad. */
export function datosDeContacto(): { etiqueta: string; valor: string; href: string | null }[] {
  const filas: { etiqueta: string; valor: string; href: string | null }[] = [];
  if (EMPRESA.telefono) {
    filas.push({
      etiqueta: 'Teléfono',
      valor: EMPRESA.telefono,
      href: EMPRESA.telefonoE164 ? `tel:${EMPRESA.telefonoE164}` : null,
    });
  }
  // Mismo número que el teléfono, pero como acción distinta: para no repetir la
  // misma cifra dos veces (confuso al leerlo), el enlace dice «Enviar mensaje».
  const wa = enlaceWhatsApp();
  if (wa) filas.push({ etiqueta: 'WhatsApp', valor: 'Enviar mensaje', href: wa });
  if (EMPRESA.email) filas.push({ etiqueta: 'Email', valor: EMPRESA.email, href: `mailto:${EMPRESA.email}` });
  if (EMPRESA.direccion) filas.push({ etiqueta: 'Dirección', valor: EMPRESA.direccion, href: null });
  if (EMPRESA.horario) filas.push({ etiqueta: 'Horario', valor: EMPRESA.horario, href: null });
  return filas;
}
