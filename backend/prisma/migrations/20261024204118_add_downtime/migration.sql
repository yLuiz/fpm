-- CreateEnum
CREATE TYPE "DowntimeCause" AS ENUM ('MECHANICAL', 'ELECTRICAL', 'OPERATIONAL', 'OTHER');

-- CreateTable
CREATE TABLE "downtimes" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "cause" "DowntimeCause" NOT NULL,
    "description" TEXT NOT NULL,
    "preventiveOverdue" BOOLEAN NOT NULL DEFAULT false,
    "correctiveId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "downtimes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "downtimes_correctiveId_key" ON "downtimes"("correctiveId");

-- CreateIndex
CREATE INDEX "downtimes_equipmentId_idx" ON "downtimes"("equipmentId");

-- CreateIndex
CREATE INDEX "downtimes_startedAt_idx" ON "downtimes"("startedAt");

-- CreateIndex
CREATE INDEX "downtimes_endedAt_idx" ON "downtimes"("endedAt");

-- CreateIndex
CREATE INDEX "downtimes_deletedAt_idx" ON "downtimes"("deletedAt");

-- AddForeignKey
ALTER TABLE "downtimes" ADD CONSTRAINT "downtimes_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downtimes" ADD CONSTRAINT "downtimes_correctiveId_fkey" FOREIGN KEY ("correctiveId") REFERENCES "maintenances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
