/*
  Warnings:

  - Added the required column `distributorPlanPriceId` to the `SignatureRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `planId` to the `SignatureRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SignatureRequest" ADD COLUMN     "distributorPlanPriceId" TEXT NOT NULL,
ADD COLUMN     "planId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SignatureRequest_planId_idx" ON "SignatureRequest"("planId");

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_distributorPlanPriceId_fkey" FOREIGN KEY ("distributorPlanPriceId") REFERENCES "DistributorPlanPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
