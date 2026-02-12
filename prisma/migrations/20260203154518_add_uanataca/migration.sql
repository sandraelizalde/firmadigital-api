/*
  Warnings:

  - You are about to drop the column `durationPromo` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `eligibleClientsType` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `isPromo` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `perfil` on the `Plan` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[perfilNaturalEnext]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[perfilJuridicoEnext]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[perfilNaturalUanataca]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[perfilJuridicoUanataca]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[perfilNaturalTokenUanataca]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[perfilJuridicoTokenUanataca]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SignatureProvider" AS ENUM ('ENEXT', 'UANATACA');

-- DropIndex
DROP INDEX "Plan_perfil_key";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "durationPromo",
DROP COLUMN "eligibleClientsType",
DROP COLUMN "isPromo",
DROP COLUMN "perfil",
ADD COLUMN     "perfilJuridicoEnext" TEXT,
ADD COLUMN     "perfilJuridicoTokenUanataca" TEXT,
ADD COLUMN     "perfilJuridicoUanataca" TEXT,
ADD COLUMN     "perfilNaturalEnext" TEXT,
ADD COLUMN     "perfilNaturalTokenUanataca" TEXT,
ADD COLUMN     "perfilNaturalUanataca" TEXT;

-- AlterTable
ALTER TABLE "SignatureRequest" ADD COLUMN     "provider" "SignatureProvider" NOT NULL DEFAULT 'ENEXT';

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
