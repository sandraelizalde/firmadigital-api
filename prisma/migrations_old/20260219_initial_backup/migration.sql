-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "IdentificationType" AS ENUM ('CEDULA', 'RUC');

-- CreateEnum
CREATE TYPE "TypeClient" AS ENUM ('PERSONA_NATURAL_SIN_RUC', 'PERSONA_NATURAL_CON_RUC', 'PERSONA_JURIDICA');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('COMPLETED', 'PENDING', 'REJECTED', 'FAILED', 'ANNULLED');

-- CreateEnum
CREATE TYPE "RechargeMethod" AS ENUM ('CARD', 'TRANSFER', 'MANUAL');

-- CreateEnum
CREATE TYPE "RechargeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INCOME', 'EXPENSE', 'ADJUSTMENT', 'CREDIT');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BALANCE', 'CREDIT');

-- CreateEnum
CREATE TYPE "SignatureProvider" AS ENUM ('ENEXT', 'UANATACA');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateTable
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "socialReason" TEXT,
    "identificationType" "IdentificationType" NOT NULL,
    "identification" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'QUITO',
    "phone" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "contractSignedUrl" TEXT,
    "identificationFrontUrl" TEXT,
    "identificationBackUrl" TEXT,
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
    "perfilNaturalEnext" TEXT,
    "perfilJuridicoEnext" TEXT,
    "perfilNaturalUanataca" TEXT,
    "perfilJuridicoUanataca" TEXT,
    "perfilNaturalTokenUanataca" TEXT,
    "perfilJuridicoTokenUanataca" TEXT,
    "basePrice" INTEGER NOT NULL,
    "duration" TEXT NOT NULL,
    "durationType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributorPlanPrice" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "customPrice" INTEGER NOT NULL,
    "customPricePromo" INTEGER,
    "promoStartDate" TIMESTAMP(3),
    "promoEndDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorPlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureRequest" (
    "id" TEXT NOT NULL,
    "numero_tramite" TEXT NOT NULL,
    "distributorPlanPriceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
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
    "priceCharged" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BALANCE',
    "annulledBy" TEXT,
    "annulledNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "distributorId" TEXT,
    "provider" "SignatureProvider" NOT NULL DEFAULT 'ENEXT',

    CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recharge" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "method" "RechargeMethod" NOT NULL,
    "requestedAmount" INTEGER NOT NULL,
    "creditedAmount" INTEGER,
    "commission" INTEGER,
    "status" "RechargeStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "adminNote" TEXT,
    "paymentReference" TEXT,
    "transferDate" TIMESTAMP(3),
    "receiptFile" TEXT,
    "numberReceipt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributorCredit" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "creditDays" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCutoff" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "cutoffDate" TIMESTAMP(3) NOT NULL,
    "paymentDueDate" TIMESTAMP(3) NOT NULL,
    "amountUsed" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "signaturesCount" INTEGER NOT NULL DEFAULT 0,
    "signaturesDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCutoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountMovement" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "detail" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "rechargeId" TEXT,
    "signatureId" TEXT,
    "adminName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distributorCreditId" TEXT,

    CONSTRAINT "AccountMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenInfo" (
    "id" TEXT NOT NULL,
    "signatureRequestId" TEXT NOT NULL,
    "shippingTypeUuid" TEXT NOT NULL,
    "deliveryMethod" "DeliveryMethod" NOT NULL,
    "office" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "province" TEXT,
    "city" TEXT,
    "mainStreet" TEXT,
    "houseNumber" TEXT,
    "secondaryStreet" TEXT,
    "reference" TEXT,
    "recipientIdentification" TEXT,
    "recipientName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_identification_key" ON "Distributor"("identification");

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_email_key" ON "Distributor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInfo_distributorId_key" ON "BillingInfo"("distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_perfilNaturalEnext_key" ON "Plan"("perfilNaturalEnext");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_perfilJuridicoEnext_key" ON "Plan"("perfilJuridicoEnext");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_perfilNaturalUanataca_key" ON "Plan"("perfilNaturalUanataca");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_perfilJuridicoUanataca_key" ON "Plan"("perfilJuridicoUanataca");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_perfilNaturalTokenUanataca_key" ON "Plan"("perfilNaturalTokenUanataca");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_perfilJuridicoTokenUanataca_key" ON "Plan"("perfilJuridicoTokenUanataca");

-- CreateIndex
CREATE INDEX "DistributorPlanPrice_distributorId_idx" ON "DistributorPlanPrice"("distributorId");

-- CreateIndex
CREATE INDEX "DistributorPlanPrice_planId_idx" ON "DistributorPlanPrice"("planId");

-- CreateIndex
CREATE INDEX "DistributorPlanPrice_isActive_idx" ON "DistributorPlanPrice"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorPlanPrice_distributorId_planId_key" ON "DistributorPlanPrice"("distributorId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureRequest_numero_tramite_key" ON "SignatureRequest"("numero_tramite");

-- CreateIndex
CREATE INDEX "SignatureRequest_distributorId_createdAt_idx" ON "SignatureRequest"("distributorId", "createdAt");

-- CreateIndex
CREATE INDEX "SignatureRequest_planId_idx" ON "SignatureRequest"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Recharge_numberReceipt_key" ON "Recharge"("numberReceipt");

-- CreateIndex
CREATE INDEX "DistributorCredit_distributorId_isActive_idx" ON "DistributorCredit"("distributorId", "isActive");

-- CreateIndex
CREATE INDEX "DistributorCredit_distributorId_isBlocked_idx" ON "DistributorCredit"("distributorId", "isBlocked");

-- CreateIndex
CREATE INDEX "CreditCutoff_distributorId_cutoffDate_idx" ON "CreditCutoff"("distributorId", "cutoffDate");

-- CreateIndex
CREATE INDEX "CreditCutoff_creditId_isPaid_idx" ON "CreditCutoff"("creditId", "isPaid");

-- CreateIndex
CREATE INDEX "CreditCutoff_paymentDueDate_isPaid_idx" ON "CreditCutoff"("paymentDueDate", "isPaid");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCutoff_creditId_cutoffDate_key" ON "CreditCutoff"("creditId", "cutoffDate");

-- CreateIndex
CREATE INDEX "AccountMovement_signatureId_idx" ON "AccountMovement"("signatureId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenInfo_signatureRequestId_key" ON "TokenInfo"("signatureRequestId");

-- CreateIndex
CREATE INDEX "TokenInfo_signatureRequestId_idx" ON "TokenInfo"("signatureRequestId");

-- CreateIndex
CREATE INDEX "Advertisement_isActive_idx" ON "Advertisement"("isActive");

-- AddForeignKey
ALTER TABLE "BillingInfo" ADD CONSTRAINT "BillingInfo_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorPlanPrice" ADD CONSTRAINT "DistributorPlanPrice_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorPlanPrice" ADD CONSTRAINT "DistributorPlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_distributorPlanPriceId_fkey" FOREIGN KEY ("distributorPlanPriceId") REFERENCES "DistributorPlanPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recharge" ADD CONSTRAINT "Recharge_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorCredit" ADD CONSTRAINT "DistributorCredit_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCutoff" ADD CONSTRAINT "CreditCutoff_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCutoff" ADD CONSTRAINT "CreditCutoff_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "DistributorCredit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountMovement" ADD CONSTRAINT "AccountMovement_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountMovement" ADD CONSTRAINT "AccountMovement_rechargeId_fkey" FOREIGN KEY ("rechargeId") REFERENCES "Recharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountMovement" ADD CONSTRAINT "AccountMovement_distributorCreditId_fkey" FOREIGN KEY ("distributorCreditId") REFERENCES "DistributorCredit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenInfo" ADD CONSTRAINT "TokenInfo_signatureRequestId_fkey" FOREIGN KEY ("signatureRequestId") REFERENCES "SignatureRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
