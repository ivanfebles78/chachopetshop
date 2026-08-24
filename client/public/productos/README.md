# Fotografías de producto

Aquí van las fotos REALES de los productos. Cuando un producto tiene su
fotografía, el frontend la usa; si no la tiene, dibuja la ilustración de su
categoría (Fase 2H). La comprobación vive en `client/src/lib/imagenes.ts`.

## Convención

- El **original** se conserva sin tocar (`.png`), tal y como lo entrega el
  proveedor o el fabricante.
- Junto a él, una derivada `.webp` para servir en web.
- El campo `image` del producto apunta a la `.webp`.

## Por qué no hay versiones más grandes

El original de Alpha Spirit mide 603 × 772 px. Generar una derivada de 1200 px
sería ampliar una imagen pequeña, que es exactamente lo que produce ese aspecto
borroso de tienda improvisada. Si llega un original mayor, entonces sí tendrá
sentido una segunda medida.

| Fichero | Origen | Uso |
|---|---|---|
| `alpha-spirit-the-only-one-pato.png` | original del fabricante, 342 kB | archivo, no se sirve |
| `alpha-spirit-the-only-one-pato.webp` | derivada 603 px, 27 kB | la que ve el cliente |
