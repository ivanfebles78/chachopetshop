/**
 * CLIENTE DE SOLO LECTURA DE FACTUSOL (API DELSOL) para el panel.
 *
 * ⚠️ A Factusol SOLO se le LEE (SELECT). Nunca se escribe nada en Factusol.
 *
 * Lo usa el comparador del panel («Base de datos vs Factusol»): dado el EAN o el
 * SKU de un producto nuestro, busca el artículo correspondiente en Factusol y
 * devuelve sus campos tal cual, más la traducción de su familia a animal +
 * categoría web (el mismo mapa que usa el sincronizador).
 */

const API = 'https://api.sdelsol.com';

function credenciales() {
  return {
    codigoFabricante: Number(process.env.FACTUSOL_COD_FABRICANTE),
    codigoCliente: Number(process.env.FACTUSOL_COD_CLIENTE),
    baseDatosCliente: process.env.FACTUSOL_BASE_DATOS,
    // En claro en el entorno; la API la quiere en BASE64.
    password: Buffer.from(process.env.FACTUSOL_PASSWORD ?? '', 'utf8').toString('base64'),
  };
}
const EJERCICIO = process.env.FACTUSOL_EJERCICIO || '2026';
const ALMACEN = process.env.FACTUSOL_ALMACEN || 'GEN';
const TARIFA = Number(process.env.FACTUSOL_TARIFA || 1);

/** ¿Están puestas las variables FACTUSOL_* en el servidor? */
export function hayCredencialesFactusol(): boolean {
  const c = credenciales();
  return Boolean(c.codigoFabricante && c.codigoCliente && c.baseDatosCliente && process.env.FACTUSOL_PASSWORD);
}

/** Mapa familia Factusol → (animal, categoría web). Idéntico al del sincronizador. */
const FAMILIAS: Record<string, { animal: string | null; cat: string }> = {
  PAS: { animal: 'perro', cat: 'alimentacion-seca' },
  PAH: { animal: 'perro', cat: 'alimentacion-humeda' },
  PSN: { animal: 'perro', cat: 'snacks-y-premios' },
  PAN: { animal: 'perro', cat: 'salud-y-antiparasitarios' },
  PSU: { animal: 'perro', cat: 'higiene-y-cosmetica' },
  PBA: { animal: 'perro', cat: 'higiene-y-cosmetica' },
  PAC: { animal: 'perro', cat: 'accesorios' },
  GAS: { animal: 'gato', cat: 'alimentacion-seca' },
  GAH: { animal: 'gato', cat: 'alimentacion-humeda' },
  GSN: { animal: 'gato', cat: 'snacks-y-premios' },
  GAN: { animal: 'gato', cat: 'salud-y-antiparasitarios' },
  GSU: { animal: 'gato', cat: 'higiene-y-cosmetica' },
  GBA: { animal: 'gato', cat: 'higiene-y-cosmetica' },
  GAC: { animal: 'gato', cat: 'accesorios' },
  XXX: { animal: 'gato', cat: 'otros' },
  AAS: { animal: 'ave', cat: 'semillas-y-forraje' },
  AAM: { animal: 'ave', cat: 'semillas-y-forraje' },
  AAP: { animal: 'ave', cat: 'semillas-y-forraje' },
  AAV: { animal: 'ave', cat: 'higiene-y-cosmetica' },
  AAC: { animal: 'ave', cat: 'accesorios' },
  PCL: { animal: 'pez', cat: 'alimentacion-seca' },
  PTR: { animal: 'pez', cat: 'salud-y-antiparasitarios' },
  PEA: { animal: 'pez', cat: 'accesorios' },
  RAL: { animal: 'roedor', cat: 'alimentacion-seca' },
  RSN: { animal: 'roedor', cat: 'snacks-y-premios' },
  RAC: { animal: 'roedor', cat: 'accesorios' },
  REA: { animal: 'reptil', cat: 'alimentacion-seca' },
  RET: { animal: 'reptil', cat: 'accesorios' },
  TRA: { animal: null, cat: 'accesorios' },
  PEL: { animal: null, cat: 'otros' },
  REG: { animal: null, cat: 'otros' },
  AGR: { animal: null, cat: 'otros' },
  GAV: { animal: null, cat: 'otros' },
  GBO: { animal: null, cat: 'otros' },
  GEQ: { animal: null, cat: 'otros' },
  GOV: { animal: null, cat: 'otros' },
  GPO: { animal: null, cat: 'otros' },
};

type RespAuth = { respuesta?: string; resultado?: string };
type RespConsulta = { respuesta?: string; resultado?: { columna: string; dato: unknown }[][] };

let token: string | null = null;

async function autenticar(): Promise<void> {
  const r = await fetch(`${API}/login/Autenticar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credenciales()),
  });
  const j = (await r.json()) as RespAuth;
  if (j.respuesta !== 'OK' || !j.resultado) throw new Error('Autenticación con Factusol falló.');
  token = j.resultado;
}

async function consulta(sql: string): Promise<Record<string, unknown>[]> {
  if (!token) await autenticar();
  const llamar = async (): Promise<RespConsulta> => {
    const r = await fetch(`${API}/admin/LanzarConsulta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ ejercicio: EJERCICIO, consulta: sql }),
    });
    return (await r.json()) as RespConsulta;
  };
  let j = await llamar();
  if (j.respuesta === 'Unauthorized') {
    await autenticar();
    j = await llamar();
  }
  if (j.respuesta !== 'OK') throw new Error('Consulta Factusol falló.');
  return (j.resultado ?? []).map((rec) => Object.fromEntries(rec.map((c) => [c.columna, c.dato])));
}

export type ArticuloFactusol = {
  codart: string;
  eanart: string;
  refart: string;
  desart: string;
  famart: string;
  /** PVP con IGIC (tarifa configurada). null si no hay precio. */
  pvp: number | null;
  /** Stock del almacén configurado. null si no hay dato. */
  stock: number | null;
  /** Traducción de la familia: slug de animal (o null) y slug de categoría web. */
  animal: string | null;
  categoria: string;
};

// Sólo se consultan identificadores con esta forma (dígitos, letras y unos pocos
// separadores). Como nunca llevan comillas, es seguro interpolarlos en el SELECT
// que se manda a Factusol (que además es de solo lectura).
const ID_SEGURO = /^[A-Za-z0-9._/-]{1,40}$/;

/**
 * Busca en Factusol el artículo que case con el EAN o el SKU dados (por EANART,
 * REFART o CODART). Devuelve null si no hay credenciales válidas, si los
 * identificadores no son válidos o si no se encuentra.
 */
export async function buscarArticuloFactusol(ids: { ean?: string | null; sku?: string | null }): Promise<ArticuloFactusol | null> {
  const valores = [ids.ean, ids.sku]
    .map((v) => String(v ?? '').trim())
    .filter((v) => v !== '' && ID_SEGURO.test(v));
  const unicos = [...new Set(valores)];
  if (!unicos.length) return null;

  const enLista = unicos.map((v) => `'${v}'`).join(',');
  const sql =
    'SELECT TOP 1 a.CODART, a.EANART, a.REFART, a.DESART, a.FAMART, ' +
    `(SELECT TOP 1 PRELTA FROM F_LTA WHERE ARTLTA=a.CODART AND TARLTA=${TARIFA}) AS PVP, ` +
    `(SELECT TOP 1 DISSTO FROM F_STO WHERE ARTSTO=a.CODART AND ALMSTO='${ALMACEN}') AS STOCK ` +
    `FROM F_ART a WHERE a.EANART IN (${enLista}) OR a.REFART IN (${enLista}) OR a.CODART IN (${enLista})`;

  const filas = await consulta(sql);
  const a = filas[0];
  if (!a) return null;
  const fam = String(a.FAMART ?? '').trim();
  const map = FAMILIAS[fam] ?? { animal: null, cat: 'otros' };
  const pvp = a.PVP != null && Number(a.PVP) > 0 ? Number(a.PVP) : null;
  // Para el comparador se muestra el stock REAL de Factusol, incluso negativo
  // (una existencia a -1 es un descuadre que el dueño querrá ver). El
  // sincronizador, en cambio, lo limita a 0 porque la tienda no puede vender en
  // negativo: son dos usos distintos del mismo dato.
  const stock = a.STOCK != null ? Math.floor(Number(a.STOCK)) : null;
  return {
    codart: String(a.CODART ?? '').trim(),
    eanart: String(a.EANART ?? '').trim(),
    refart: String(a.REFART ?? '').trim(),
    desart: String(a.DESART ?? '').trim(),
    famart: fam,
    pvp,
    stock,
    animal: map.animal,
    categoria: map.cat,
  };
}
