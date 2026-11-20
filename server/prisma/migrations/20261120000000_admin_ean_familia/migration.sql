-- Panel de administración: EAN y familia de Factusol como columnas propias.
--
-- Factusol no guarda marca y, hasta ahora, ni su EAN (F_ART.EANART) ni su código
-- de familia (F_ART.FAMART: PAS, PAH, GAS…) se conservaban: sólo se usaban para
-- casar el artículo con un producto nuestro. Se guardan ahora para que el panel
-- pueda mostrarlos y filtrar por ellos. Ambas columnas son NULLABLE y aditivas:
-- ningún producto existente cambia, simplemente nacen con NULL hasta la próxima
-- sincronización.

ALTER TABLE "Product" ADD COLUMN "ean" TEXT;
ALTER TABLE "Product" ADD COLUMN "familia" TEXT;

-- Para que el filtro por familia del panel no recorra toda la tabla.
CREATE INDEX "Product_familia_idx" ON "Product"("familia");
