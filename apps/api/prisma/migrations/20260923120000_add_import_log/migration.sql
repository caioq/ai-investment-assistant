-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('ASSETS', 'HOLDINGS', 'WALLET', 'REPORT');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('IMPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "import_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" "ImportSource" NOT NULL,
    "wallet_type" "WalletType",
    "file_name" TEXT NOT NULL,
    "records" INTEGER NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "message" TEXT,
    "errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_logs_user_id_created_at_idx" ON "import_logs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
