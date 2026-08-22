/**
 * DATOS DE LA EMPRESA — EL ÚNICO SITIO DONDE SE CONFIGURAN.
 *
 * Antes estaban escritos dos veces, inventados y publicados: la cabecera y la
 * página de contacto anunciaban el teléfono «922 00 00 00», y contacto añadía
 * la dirección «Calle Ejemplo, 1», un horario y un correo. Un teléfono que no
 * contesta es peor que no dar teléfono: quien lo marca se lleva la impresión de
 * que la tienda no funciona, y ya no vuelve.
 *
 * Ahora hay un solo sitio. Todo lo que valga `null` NO SE PINTA en ninguna
 * pantalla: ni en el pie, ni en contacto. No hay que tocar ningún componente,
 * ni queda ningún hueco descuadrado, ni aparece nada falso mientras tanto.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PARA IVAN: rellenar aquí, y aparece solo en el pie y en /contacto.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `razonSocial` y `nif` no son un detalle estético: la LSSI obliga a que sean
 * accesibles en una tienda que vende. Se dejan marcados en lugar de fingirlos.
 */
export const EMPRESA: {
  telefono: string | null;
  telefonoE164: string | null;
  email: string | null;
  direccion: string | null;
  horario: string | null;
  razonSocial: string | null;
  nif: string | null;
} = {
  telefono: null,      // TODO(Ivan): teléfono de atención al cliente, p. ej. '922 12 34 56'
  telefonoE164: null,  // TODO(Ivan): el mismo, para el enlace `tel:`, p. ej. '+34922123456'
  email: null,         // TODO(Ivan): correo de contacto real y atendido
  direccion: null,     // TODO(Ivan): domicilio de la tienda
  horario: null,       // TODO(Ivan): horario de atención
  razonSocial: null,   // TODO(Ivan): razón social (obligatorio, LSSI)
  nif: null,           // TODO(Ivan): NIF (obligatorio, LSSI)
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
