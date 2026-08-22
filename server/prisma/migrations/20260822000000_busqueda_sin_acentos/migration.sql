-- BUSCAR SIN ACENTOS.
--
-- «alimentacion seca» devolvía CERO resultados y «alimentación seca» devolvía
-- trece: la misma búsqueda, escrita como la escribe media España en el móvil,
-- daba una tienda vacía. `ILIKE` de PostgreSQL ignora mayúsculas pero no
-- tildes, y `mode: 'insensitive'` de Prisma es exactamente eso.
--
-- `unaccent` es la solución estándar. Se instala aquí, versionada, y no a mano
-- en producción.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- `unaccent(text)` es STABLE, no IMMUTABLE, porque depende del diccionario que
-- haya cargado la sesión — y lo que no es inmutable no se puede indexar. La
-- forma de dos argumentos fija el diccionario explícitamente, y con él ya se
-- puede envolver en una función inmutable de verdad.
CREATE OR REPLACE FUNCTION public.sin_acentos(texto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$ SELECT public.unaccent('public.unaccent', lower(texto)) $$;

-- Índices de expresión sobre lo que se busca de verdad. Con 28 productos no
-- hacen falta; con 2.800 sí, y añadirlos después obliga a recordar por qué.
CREATE INDEX IF NOT EXISTS "Product_nombre_sin_acentos_idx"
  ON "Product" (public.sin_acentos(name));
CREATE INDEX IF NOT EXISTS "Brand_nombre_sin_acentos_idx"
  ON "Brand" (public.sin_acentos(name));
CREATE INDEX IF NOT EXISTS "Category_nombre_sin_acentos_idx"
  ON "Category" (public.sin_acentos(name));
CREATE INDEX IF NOT EXISTS "Need_nombre_sin_acentos_idx"
  ON "Need" (public.sin_acentos(name));
CREATE INDEX IF NOT EXISTS "Animal_nombre_sin_acentos_idx"
  ON "Animal" (public.sin_acentos(name));
