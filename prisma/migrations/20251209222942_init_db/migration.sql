-- CreateEnum
CREATE TYPE "IdentificationType" AS ENUM ('CEDULA', 'RUC');

-- CreateEnum
CREATE TYPE "TypeClient" AS ENUM ('PERSONA_NATURAL_SIN_RUC', 'PERSONA_NATURAL_CON_RUC', 'PERSONA_JURIDICA');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('COMPLETED', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "RechargeMethod" AS ENUM ('CARD', 'TRANSFER');

-- CreateEnum
CREATE TYPE "RechargeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INCOME', 'EXPENSE', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "socialReason" TEXT,
    "identificationType" "IdentificationType" NOT NULL,
    "identification" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInfo" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "useDistributorData" BOOLEAN NOT NULL DEFAULT true,
    "socialReason" TEXT,
    "identificationType" "IdentificationType",
    "identification" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" TEXT NOT NULL,
    "durationType" TEXT NOT NULL,
    "pricePromo" DOUBLE PRECISION,
    "durationPromo" TEXT,
    "isPromo" BOOLEAN NOT NULL DEFAULT false,
    "eligibleClientsType" "TypeClient"[] DEFAULT ARRAY['PERSONA_NATURAL_SIN_RUC', 'PERSONA_NATURAL_CON_RUC']::"TypeClient"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributorPlanAssignment" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributorPlanAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributorDiscountAssignment" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributorDiscountAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mount" DOUBLE PRECISION NOT NULL,
    "limitsUse" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDiscountCode" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanDiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureRequest" (
    "id" TEXT NOT NULL,
    "numero_tramite" TEXT NOT NULL,
    "perfil_firma" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "codigo_dactilar" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "parroquia" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMPTZ(6) NOT NULL,
    "foto_frontal" TEXT NOT NULL,
    "foto_posterior" TEXT NOT NULL,
    "foto_selfie" TEXT NOT NULL,
    "video_face" TEXT,
    "pdf_sri" TEXT,
    "nombramiento" TEXT,
    "razon_social" TEXT,
    "rep_legal" TEXT,
    "cargo" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'ECUADOR',
    "clavefirma" TEXT NOT NULL,
    "ruc" TEXT,
    "tipo_envio" TEXT NOT NULL,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "providerCode" TEXT,
    "providerMessage" TEXT,
    "activeNotification" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "distributorId" TEXT,

    CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recharge" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "method" "RechargeMethod" NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "creditedAmount" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "status" "RechargeStatus" NOT NULL DEFAULT 'PENDING',
    "adminId" TEXT,
    "adminNote" TEXT,
    "paymentReference" TEXT,
    "transferDate" TIMESTAMP(3),
    "receiptFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountMovement" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "detail" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "rechargeId" TEXT,
    "signatureId" TEXT,
    "adminId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_identification_key" ON "Distributor"("identification");

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_email_key" ON "Distributor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInfo_distributorId_key" ON "BillingInfo"("distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_perfil_key" ON "Plan"("perfil");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorPlanAssignment_distributorId_planId_key" ON "DistributorPlanAssignment"("distributorId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorDiscountAssignment_distributorId_discountCodeId_key" ON "DistributorDiscountAssignment"("distributorId", "discountCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_code_idx" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_expiresAt_idx" ON "DiscountCode"("expiresAt");

-- CreateIndex
CREATE INDEX "DiscountCode_isActive_idx" ON "DiscountCode"("isActive");

-- CreateIndex
CREATE INDEX "PlanDiscountCode_planId_idx" ON "PlanDiscountCode"("planId");

-- CreateIndex
CREATE INDEX "PlanDiscountCode_discountCodeId_idx" ON "PlanDiscountCode"("discountCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDiscountCode_planId_discountCodeId_key" ON "PlanDiscountCode"("planId", "discountCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureRequest_numero_tramite_key" ON "SignatureRequest"("numero_tramite");

-- AddForeignKey
ALTER TABLE "BillingInfo" ADD CONSTRAINT "BillingInfo_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorPlanAssignment" ADD CONSTRAINT "DistributorPlanAssignment_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorPlanAssignment" ADD CONSTRAINT "DistributorPlanAssignment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorDiscountAssignment" ADD CONSTRAINT "DistributorDiscountAssignment_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorDiscountAssignment" ADD CONSTRAINT "DistributorDiscountAssignment_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDiscountCode" ADD CONSTRAINT "PlanDiscountCode_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDiscountCode" ADD CONSTRAINT "PlanDiscountCode_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_perfil_firma_fkey" FOREIGN KEY ("perfil_firma") REFERENCES "Plan"("perfil") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recharge" ADD CONSTRAINT "Recharge_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountMovement" ADD CONSTRAINT "AccountMovement_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountMovement" ADD CONSTRAINT "AccountMovement_rechargeId_fkey" FOREIGN KEY ("rechargeId") REFERENCES "Recharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
