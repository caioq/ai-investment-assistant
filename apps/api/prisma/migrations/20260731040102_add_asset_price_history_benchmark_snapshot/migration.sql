-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('EQUITY', 'FIXED_INCOME', 'CRYPTO');

-- CreateEnum
CREATE TYPE "InvestmentStyle" AS ENUM ('SMALL_CAP', 'MICRO_CAP', 'DIVIDENDS', 'VALUE_INVESTING', 'TURNAROUND');

-- CreateEnum
CREATE TYPE "RiskRating" AS ENUM ('AAA', 'A', 'B', 'C');

-- CreateEnum
CREATE TYPE "Benchmark" AS ENUM ('IBOVESPA', 'CDI');

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL DEFAULT 'EQUITY',
    "sector" TEXT,
    "sub_sector" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "exchange" TEXT NOT NULL DEFAULT 'B3',
    "investment_style" "InvestmentStyle",
    "risk_rating" "RiskRating",
    "current_price" DOUBLE PRECISION,
    "current_change_pct" DOUBLE PRECISION,
    "price_updated_at" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_snapshots" (
    "id" UUID NOT NULL,
    "benchmark" "Benchmark" NOT NULL,
    "date" DATE NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "benchmark_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_ticker_key" ON "assets"("ticker");

-- CreateIndex
CREATE INDEX "price_history_asset_id_date_idx" ON "price_history"("asset_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "price_history_asset_id_date_key" ON "price_history"("asset_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "benchmark_snapshots_benchmark_date_key" ON "benchmark_snapshots"("benchmark", "date");

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
