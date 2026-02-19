-- CreateTable
CREATE TABLE "DistributorPlanPrice" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "customPrice" DOUBLE PRECISION NOT NULL,
    "customPricePromo" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorPlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DistributorPlanPrice_distributorId_idx" ON "DistributorPlanPrice"("distributorId");

-- CreateIndex
CREATE INDEX "DistributorPlanPrice_planId_idx" ON "DistributorPlanPrice"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorPlanPrice_distributorId_planId_key" ON "DistributorPlanPrice"("distributorId", "planId");

-- AddForeignKey
ALTER TABLE "DistributorPlanPrice" ADD CONSTRAINT "DistributorPlanPrice_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorPlanPrice" ADD CONSTRAINT "DistributorPlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
