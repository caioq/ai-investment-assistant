-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('DIVIDENDS', 'OVERALL_RECOMMENDED', 'SMALL_CAPS');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('BUY', 'NEUTRAL', 'SELL');

-- CreateTable
CREATE TABLE "recommended_portfolios" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "wallet_type" "WalletType" NOT NULL,
    "source_name" TEXT,
    "effective_date" DATE NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommended_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommended_holdings" (
    "id" UUID NOT NULL,
    "recommended_portfolio_id" UUID NOT NULL,
    "asset_id" UUID,
    "label" TEXT NOT NULL,
    "target_weight_pct" DOUBLE PRECISION,
    "limit_price" DOUBLE PRECISION,
    "recommendation" "Recommendation",
    "dividend_yield_pct" DOUBLE PRECISION,
    "margin_of_safety_pct" DOUBLE PRECISION,

    CONSTRAINT "recommended_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommended_portfolios_user_id_wallet_type_effective_date_idx" ON "recommended_portfolios"("user_id", "wallet_type", "effective_date");

-- AddForeignKey
ALTER TABLE "recommended_portfolios" ADD CONSTRAINT "recommended_portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommended_holdings" ADD CONSTRAINT "recommended_holdings_recommended_portfolio_id_fkey" FOREIGN KEY ("recommended_portfolio_id") REFERENCES "recommended_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommended_holdings" ADD CONSTRAINT "recommended_holdings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
