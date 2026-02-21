/*
  Warnings:

  - You are about to drop the column `order` on the `Advertisement` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Advertisement_isActive_order_idx";

-- AlterTable
ALTER TABLE "Advertisement" DROP COLUMN "order";

-- CreateIndex
CREATE INDEX "Advertisement_isActive_idx" ON "Advertisement"("isActive");
