-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "brandId" TEXT;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "price" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "packUnits" INTEGER DEFAULT 1,
ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "unit" TEXT,
ALTER COLUMN "price" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Category_brandId_idx" ON "Category"("brandId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
