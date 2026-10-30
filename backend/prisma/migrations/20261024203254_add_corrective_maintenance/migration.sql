-- CreateEnum
CREATE TYPE "MaintenanceKind" AS ENUM ('PREVENTIVE', 'CORRECTIVE');

-- AlterTable
ALTER TABLE "maintenances" ADD COLUMN     "description" TEXT,
ADD COLUMN     "kind" "MaintenanceKind" NOT NULL DEFAULT 'PREVENTIVE',
ADD COLUMN     "originId" TEXT;

-- CreateIndex
CREATE INDEX "maintenances_kind_status_idx" ON "maintenances"("kind", "status");

-- CreateIndex
CREATE INDEX "maintenances_originId_idx" ON "maintenances"("originId");

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_originId_fkey" FOREIGN KEY ("originId") REFERENCES "maintenances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
