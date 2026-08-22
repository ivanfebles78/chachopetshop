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
  email: string | null;
  direccion: string | null;
  horario: string | null;
  razonSocial: string | null;
  nif: string | null;
} = {
  nombreComercial: 'Chacho Pet Shop',
  telefono: '628 013 933',
  telefonoE164: '+34628013933',
  email: 'chachopetshop@gmail.com',

  direccion: null,     // TODO(Ivan): domicilio de la tienda, si hay local a pie de calle
  horario: null,       // TODO(Ivan): horario de atención

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
  if (EMPRESA.email) filas.push({ etiqueta: 'Email', valor: EMPRESA.email, href: `mailto:${EMPRESA.email}` });
  if (EMPRESA.direccion) filas.push({ etiqueta: 'Dirección', valor: EMPRESA.direccion, href: null });
  if (EMPRESA.horario) filas.push({ etiqueta: 'Horario', valor: EMPRESA.horario, href: null });
  return filas;
}
