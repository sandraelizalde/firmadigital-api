/*
  Warnings:

  - You are about to drop the column `pais` on the `SignatureRequest` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "SignatureStatus" ADD VALUE 'DOCS_APPROVED';

-- AlterTable
ALTER TABLE "SignatureRequest" DROP COLUMN "pais";
