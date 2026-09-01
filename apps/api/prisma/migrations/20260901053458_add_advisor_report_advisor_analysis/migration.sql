-- CreateTable
CREATE TABLE "advisor_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_name" TEXT,
    "file_name" TEXT,
    "raw_text" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisor_analyses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "advisor_report_id" UUID,
    "recommended_portfolio_ids" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "impact_metrics" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "advisor_analyses_user_id_created_at_idx" ON "advisor_analyses"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "advisor_reports" ADD CONSTRAINT "advisor_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_analyses" ADD CONSTRAINT "advisor_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_analyses" ADD CONSTRAINT "advisor_analyses_advisor_report_id_fkey" FOREIGN KEY ("advisor_report_id") REFERENCES "advisor_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
