export const SHARED_PACKAGE_NAME = "shared";

export {
  ALLOCATION_COLOR_PALETTE,
  computeAllocation,
  type AllocationInput,
  type AllocationSlice,
} from "./allocation";
export { cagr, maxDrawdown, volatility } from "./metrics";
export type { PortfolioValuePoint } from "./metrics";
