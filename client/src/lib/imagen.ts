/**
 * SUBIR UNA FOTO DE PRODUCTO SIN ALMACENAMIENTO EXTERNO.
 *
 * El servicio corre en un único contenedor de Railway cuyo disco es efímero: un
 * archivo subido al sistema de ficheros se perdería en el siguiente despliegue.
 * Y no hay (todavía) un bucket de objetos configurado. Así que la foto que el
 * dueño sube desde el panel se guarda DENTRO de la propia base de datos, en el
 * campo `image` del producto, como una data-URL.
 *
 * Para que eso no infle la base ni las respuestas, aquí se REDIMENSIONA y
 * recomprime en el navegador antes de enviarla: como mucho `MAX_LADO` px por el
 * lado largo y JPEG de calidad media. Una foto de catálogo queda en unas pocas
 * decenas de KB, suficiente para la ficha y la miniatura del panel.
 *
 * Si algún día hay muchas fotos propias, el salto natural es mover esto a un
 * bucket y guardar sólo la URL; el resto del panel no se enteraría, porque sigue
 * siendo el mismo campo `image`.
 */

const MAX_LADO = 900; // px del lado más largo
const CALIDAD = 0.82; // calidad JPEG
const MAX_ENTRADA = 15 * 1024 * 1024; // 15 MB de archivo original como tope sano

/** Tipos de imagen que aceptamos subir. */
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/**
 * Lee un archivo de imagen, lo redimensiona y devuelve una data-URL JPEG lista
 * para guardar en el campo `image`. Lanza un Error con mensaje claro si el
 * archivo no es una imagen válida o no se puede procesar.
 */
export async function archivoAImagen(file: File): Promise<string> {
  if (!TIPOS.includes(file.type)) {
    throw new Error('Formato no admitido. Usa JPG, PNG, WebP, GIF o AVIF.');
  }
  if (file.size > MAX_ENTRADA) {
    throw new Error('La imagen es demasiado grande (máximo 15 MB).');
  }

  const bitmap = await cargarBitmap(file);
  try {
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * escala));
    const h = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen en este navegador.');
    // Fondo blanco: los PNG/WebP con transparencia quedarían negros al pasar a
    // JPEG, y una ficha de producto se ve mejor sobre blanco.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', CALIDAD);
    if (!dataUrl.startsWith('data:image/jpeg')) {
      throw new Error('No se pudo convertir la imagen.');
    }
    return dataUrl;
  } finally {
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();
  }
}

/**
 * Carga el archivo como algo que se pueda dibujar en un canvas. Se prefiere
 * `createImageBitmap` (rápido y sin depender del DOM), con respaldo a `<img>`
 * para navegadores que no lo tengan.
 */
async function cargarBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Cae al respaldo con <img>.
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}
