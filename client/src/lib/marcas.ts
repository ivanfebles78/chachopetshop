/**
 * LOGOS OFICIALES DE MARCA, con su extensión REAL.
 *
 * Fichero único para que la portada, el menú y donde haga falta pinten el mismo
 * logo sin duplicar la tabla. Se guarda el formato nativo de cada marca (SVG
 * cuando la web oficial lo da —nítido a cualquier tamaño— y PNG/JPG si no). Una
 * marca sin entrada aquí se muestra con su NOMBRE, que es lo honesto: mejor el
 * nombre que el logo de otra.
 */
export const LOGO_MARCA: Record<string, string> = {
  gosbi: '/marcas/gosbi.svg',
  freedog: '/marcas/freedog.svg',
  ownat: '/marcas/ownat.svg',
  bubimex: '/marcas/bubimex.png',
  disugual: '/marcas/disugual.png',
  atlantic: '/marcas/atlantic.png',
  duvo: '/marcas/duvo.jpg',
  nobleza: '/marcas/nobleza.jpg',
};

/** La ruta del logo de una marca, o `undefined` si no lo tenemos. */
export function logoDeMarca(slug: string): string | undefined {
  return LOGO_MARCA[slug];
}
