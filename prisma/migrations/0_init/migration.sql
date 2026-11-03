-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "sessionVersion" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "BuyBox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yearMin" INTEGER,
    "yearMax" INTEGER,
    "maxMileage" INTEGER,
    "acquisitionMin" INTEGER,
    "acquisitionMax" INTEGER,
    "targetRetailMin" INTEGER,
    "targetRetailMax" INTEGER,
    "targetMinGross" INTEGER NOT NULL DEFAULT 3000,
    "radiusMiles" INTEGER NOT NULL DEFAULT 100,
    "makeRules" TEXT NOT NULL DEFAULT '[]',
    "excludedKeywords" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lead" (
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
    "assignedTo" TEXT,
    "nextAction" TEXT,
    "nextActionAt" DATETIME,
    "nextActionCompletedAt" DATETIME,
    "outcomeReason" TEXT,
    "outcomeNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "actor" TEXT,
    "leadId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dealership" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lead_vin_idx" ON "Lead"("vin");

-- CreateIndex
CREATE INDEX "Lead_stage_passedAt_createdAt_idx" ON "Lead"("stage", "passedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_leadId_createdAt_idx" ON "Activity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "AccessRequest_status_createdAt_idx" ON "AccessRequest"("status", "createdAt");

