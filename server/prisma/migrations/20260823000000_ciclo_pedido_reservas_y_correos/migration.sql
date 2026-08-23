-- FASE 2E — ciclo de vida del pedido, reservas con caducidad y correos.
--
-- Todo lo de aquí es ADITIVO. No se borra ninguna columna, no se cambia el tipo
-- de ninguna, y `OrderStatus` conserva sus cinco valores: los pedidos que ya
-- existen en producción siguen siendo válidos exactamente igual que antes.

-- ── Estado operativo, separado del estado de pago ──────────────────────────
CREATE TYPE "OrderFulfillment" AS ENUM ('PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

ALTER TABLE "Order" ADD COLUMN "fulfillment" "OrderFulfillment";
ALTER TABLE "Order" ADD COLUMN "reservedUntil" TIMESTAMP(3);

-- Los pedidos que ya estaban marcados como servidos o cancelados conservan ese
-- significado en el eje nuevo. `status` NO se toca: si esto hubiera que
-- revertirlo, basta con ignorar la columna nueva.
--
-- `FULFILLED` significaba «enviado» — así se le enseñaba al cliente desde la
-- Fase 2D—, así que se traduce a SHIPPED y no a DELIVERED: decir «entregado»
-- de un pedido que sólo se sabe que salió sería inventarse un hecho.
UPDATE "Order" SET "fulfillment" = 'SHIPPED'   WHERE "status" = 'FULFILLED';
UPDATE "Order" SET "fulfillment" = 'CANCELLED' WHERE "status" = 'CANCELLED';

-- Las reservas que siguen vivas al desplegar reciben una fecha límite. Sin
-- esto, un pedido PENDING anterior a esta migración retendría stock para
-- siempre, porque la limpieza sólo mira `reservedUntil`.
--
-- Se les da 30 minutos desde su creación, que es la política: si ya han pasado,
-- la primera pasada de limpieza los libera, que es justo lo que corresponde.
UPDATE "Order"
   SET "reservedUntil" = "createdAt" + INTERVAL '30 minutes'
 WHERE "status" = 'PENDING' AND "stockCommitted" = true;

CREATE INDEX "Order_status_stockCommitted_reservedUntil_idx"
    ON "Order" ("status", "stockCommitted", "reservedUntil");

-- ── Un correo por pedido y tipo ────────────────────────────────────────────
CREATE TYPE "NotificationKind"   AS ENUM ('ORDER_CONFIRMATION', 'INTERNAL_NEW_ORDER');
CREATE TYPE "NotificationStatus" AS ENUM ('SENDING', 'SENT', 'FAILED');

CREATE TABLE "OrderNotification" (
    "id"        TEXT NOT NULL,
    "orderId"   TEXT NOT NULL,
    "kind"      "NotificationKind" NOT NULL,
    "status"    "NotificationStatus" NOT NULL DEFAULT 'SENDING',
    "attempts"  INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt"    TIMESTAMP(3),

    CONSTRAINT "OrderNotification_pkey" PRIMARY KEY ("id")
);

-- LA garantía de que nadie recibe el correo dos veces. La impone PostgreSQL,
-- no una comprobación en memoria: sobrevive al reinicio y vale con N instancias.
CREATE UNIQUE INDEX "OrderNotification_orderId_kind_key" ON "OrderNotification" ("orderId", "kind");
CREATE INDEX "OrderNotification_status_idx" ON "OrderNotification" ("status");

ALTER TABLE "OrderNotification"
  ADD CONSTRAINT "OrderNotification_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
