/*
  Warnings:

  - You are about to drop the column `clavefirma` on the `SignatureRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SignatureRequest" DROP COLUMN "clavefirma";

-- DropEnum
DROP TYPE "TypeClient";
