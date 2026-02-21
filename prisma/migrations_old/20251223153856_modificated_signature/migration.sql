/*
  Warnings:

  - You are about to drop the column `foto_selfie` on the `SignatureRequest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SignatureRequest" DROP CONSTRAINT "SignatureRequest_perfil_firma_fkey";

-- AlterTable
ALTER TABLE "SignatureRequest" DROP COLUMN "foto_selfie";
