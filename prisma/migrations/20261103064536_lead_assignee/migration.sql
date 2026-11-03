-- Lead.assignedTo (free-text email) becomes Lead.assignedToId, a relation to
-- User. Existing assignments are carried over to the user with that email;
-- one whose user no longer exists becomes unassigned rather than guessed.
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vin" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "listingTitle" TEXT,
    "price" INTEGER,
    "miles" INTEGER,
    "distanceMiles" REAL,
    "searchZip" TEXT,
    "searchRadius" INTEGER,
    "city" TEXT,
    "state" TEXT,
    "source" TEXT,
    "vdp_url" TEXT,
    "photo_url" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'New Leads',
    "sellerName" TEXT,
    "sellerPhone" TEXT,
    "watchedAt" DATETIME,
    "passedAt" DATETIME,
    "assignedToId" TEXT,
    "nextAction" TEXT,
    "nextActionAt" DATETIME,
    "nextActionCompletedAt" DATETIME,
    "outcomeReason" TEXT,
    "outcomeNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("assignedToId", "city", "createdAt", "distanceMiles", "id", "listingTitle", "make", "miles", "model", "nextAction", "nextActionAt", "nextActionCompletedAt", "outcomeNote", "outcomeReason", "passedAt", "photo_url", "price", "searchRadius", "searchZip", "sellerName", "sellerPhone", "source", "stage", "state", "trim", "updatedAt", "vdp_url", "vin", "watchedAt", "year") SELECT
    (SELECT "id" FROM "User" WHERE "User"."email" = "Lead"."assignedTo"),
    "city", "createdAt", "distanceMiles", "id", "listingTitle", "make", "miles", "model", "nextAction", "nextActionAt", "nextActionCompletedAt", "outcomeNote", "outcomeReason", "passedAt", "photo_url", "price", "searchRadius", "searchZip", "sellerName", "sellerPhone", "source", "stage", "state", "trim", "updatedAt", "vdp_url", "vin", "watchedAt", "year" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_vin_idx" ON "Lead"("vin");
CREATE INDEX "Lead_stage_passedAt_createdAt_idx" ON "Lead"("stage", "passedAt", "createdAt");
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
