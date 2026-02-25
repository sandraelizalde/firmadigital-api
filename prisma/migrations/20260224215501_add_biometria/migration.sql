-- CreateEnum
CREATE TYPE "BiometryStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED', 'COMPLETED_MISSING_PASSWORD');

-- AlterTable
ALTER TABLE "SignatureRequest" ADD COLUMN     "biometryStatus" "BiometryStatus";
