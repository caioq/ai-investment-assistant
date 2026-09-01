/**
 * 1 MB — far beyond any realistic CSV upload this API accepts (holdings,
 * wallet, assets classification); caps the in-memory `FileInterceptor`
 * upload so an authenticated endpoint can't be used to exhaust process
 * memory (CONVENTIONS.md -> "File uploads").
 *
 * Previously duplicated as a private const in each controller
 * (`PortfolioController`, `RecommendedPortfoliosController`); moved here once
 * `MarketDataController` became a third consumer (MARKET_DATA_US-5_T-5) so
 * the limit isn't copy-pasted a third time.
 */
export const MAX_CSV_UPLOAD_BYTES = 1024 * 1024;

/**
 * 10 MB — a research report PDF (`POST /advisor/reports/upload`,
 * ADVISOR_US-1_T-2) is legitimately larger than a holdings/wallet/assets
 * CSV, so it gets its own constant rather than reusing
 * `MAX_CSV_UPLOAD_BYTES`: silently rejecting a real multi-page report at 1
 * MB would look like a broken upload, not a deliberate limit. Still bounded
 * (not `Infinity`) for the same in-memory-`FileInterceptor` reason as above.
 */
export const MAX_PDF_UPLOAD_BYTES = 10 * 1024 * 1024;
