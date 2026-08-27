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
