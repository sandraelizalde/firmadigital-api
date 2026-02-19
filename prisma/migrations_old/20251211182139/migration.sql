/*
  Warnings:

  - You are about to drop the column `mount` on the `DiscountCode` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `pricePromo` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the `DistributorPlanAssignment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `amount` to the `DiscountCode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basePrice` to the `Plan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DistributorDiscountAssignment" DROP CONSTRAINT "DistributorDiscountAssignment_discountCodeId_fkey";

-- DropForeignKey
ALTER TABLE "DistributorDiscountAssignment" DROP CONSTRAINT "DistributorDiscountAssignment_distributorId_fkey";

-- DropForeignKey
ALTER TABLE "DistributorPlanAssignment" DROP CONSTRAINT "DistributorPlanAssignment_distributorId_fkey";

-- DropForeignKey
ALTER TABLE "DistributorPlanAssignment" DROP CONSTRAINT "DistributorPlanAssignment_planId_fkey";

-- AlterTable
ALTER TABLE "DiscountCode" DROP COLUMN "mount",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "price",
DROP COLUMN "pricePromo",
ADD COLUMN     "basePrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "basePricePromo" DOUBLE PRECISION,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SignatureRequest" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "DistributorPlanAssignment";

-- CreateIndex
CREATE INDEX "DistributorDiscountAssignment_distributorId_idx" ON "DistributorDiscountAssignment"("distributorId");

-- CreateIndex
CREATE INDEX "DistributorDiscountAssignment_discountCodeId_idx" ON "DistributorDiscountAssignment"("discountCodeId");

-- CreateIndex
CREATE INDEX "DistributorPlanPrice_isActive_idx" ON "DistributorPlanPrice"("isActive");

-- AddForeignKey
ALTER TABLE "DistributorDiscountAssignment" ADD CONSTRAINT "DistributorDiscountAssignment_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorDiscountAssignment" ADD CONSTRAINT "DistributorDiscountAssignment_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
