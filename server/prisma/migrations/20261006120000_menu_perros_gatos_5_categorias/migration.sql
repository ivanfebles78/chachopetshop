-- Menú de perros/gatos acotado a 5 categorías (solo cabecera).
-- Cambios de DATOS (no de esquema): se aplican con `prisma migrate deploy`.

-- 1) Renombrar «Higiene y cosmética» → «Suplementos y cosmética». Se conserva el
--    slug (higiene-y-cosmetica) para no romper enlaces ni filtros existentes.
UPDATE "Category" SET name = 'Suplementos y cosmética' WHERE slug = 'higiene-y-cosmetica';

-- 2) Abrir hueco en 3ª posición (detrás de «Alimentación húmeda») desplazando las
--    categorías iguales o posteriores. Idempotente dentro de la migración.
UPDATE "Category" SET "sortOrder" = "sortOrder" + 1
  WHERE "sortOrder" >= 3 AND slug <> 'alimentacion-semihumeda';

-- 3) Recuperar «Alimentación semihúmeda» (vacía de momento; se llenará cuando haya
--    productos). ON CONFLICT para no fallar si ya existiera.
INSERT INTO "Category" (id, name, slug, type, "sortOrder")
VALUES ('cat-alimentacion-semihumeda', 'Alimentación semihúmeda', 'alimentacion-semihumeda', 'SEMIMOIST', 3)
ON CONFLICT (slug) DO NOTHING;
