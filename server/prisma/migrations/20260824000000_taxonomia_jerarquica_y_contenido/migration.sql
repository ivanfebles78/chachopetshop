-- FASE 2I — jerarquía de catálogo y contenido enriquecido de ficha.
--
-- Todo ADITIVO y todo opcional: ninguna columna se borra, ningún tipo cambia y
-- los 28 productos que ya existen siguen siendo válidos sin tocar una fila.

-- ── Jerarquía de categorías ───────────────────────────────────────────────
--
-- La estructura comercial real tiene tres niveles: animal → categoría → línea
-- de marca. `Category` era plana, así que no había dónde colgar la línea de
-- marca ni forma de que el menú creciera sin escribirlo a mano.
ALTER TABLE "Category" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Category" ADD COLUMN "animalId" TEXT;

CREATE INDEX "Category_parentId_idx" ON "Category" ("parentId");
CREATE INDEX "Category_animalId_idx" ON "Category" ("animalId");

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_animalId_fkey"
  FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Contenido enriquecido de ficha ────────────────────────────────────────
--
-- Composición, análisis, características, proceso de fabricación,
-- recomendaciones y tabla de raciones. Una columna JSON y no ocho columnas
-- nuevas: este contenido sólo se pinta, no se consulta ni se filtra, así que
-- normalizarlo no compra nada y cuesta una migración por cada campo futuro.
ALTER TABLE "Product" ADD COLUMN "contenido" JSONB;
