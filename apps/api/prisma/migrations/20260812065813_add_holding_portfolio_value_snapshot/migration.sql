-- CreateTable
CREATE TABLE "holdings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "avg_price" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_value_snapshots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_value" DOUBLE PRECISION NOT NULL,
    "total_invested" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "portfolio_value_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "holdings_user_id_idx" ON "holdings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "holdings_user_id_asset_id_key" ON "holdings"("user_id", "asset_id");

-- CreateIndex
CREATE INDEX "portfolio_value_snapshots_user_id_date_idx" ON "portfolio_value_snapshots"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_value_snapshots_user_id_date_key" ON "portfolio_value_snapshots"("user_id", "date");

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_value_snapshots" ADD CONSTRAINT "portfolio_value_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
