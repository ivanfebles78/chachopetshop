-- «Solo tienda física»: oculta el producto de la web sin que el sincronizador
-- de Factusol pueda revertirlo (a diferencia de `active`, que la sync reactiva).
-- Columna NOT NULL con DEFAULT false: aditiva, ningún producto cambia de
-- comportamiento (todos nacen visibles online).
ALTER TABLE "Product" ADD COLUMN "soloTienda" BOOLEAN NOT NULL DEFAULT false;
