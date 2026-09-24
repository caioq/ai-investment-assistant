import { TextField } from "../ui/TextField";
import type { WalletDetails } from "./useWalletImportState";

export interface WalletDetailsFieldsProps {
  details: WalletDetails;
  onChange: (field: keyof WalletDetails, value: string) => void;
}

/**
 * The model-wallets panel's detail fields (`specs/data-sources/spec.md` →
 * Detail fields): Research house (`sourceName`, defaulting to the last value
 * used in this session) and Effective date (`effectiveDate`, defaulting to
 * today), both required and both built on the existing `TextField` primitive
 * rather than a second input style.
 *
 * Presentational only: the values and their per-type defaulting live in
 * `useWalletImportState`, so switching wallet type swaps the values without
 * this component remounting or losing anything.
 */
export function WalletDetailsFields({
  details,
  onChange,
}: WalletDetailsFieldsProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
      }}
    >
      <TextField
        id="wallet-source-name"
        label="Research house"
        required
        placeholder="e.g. Meridian Research"
        value={details.sourceName}
        onChange={(event) => onChange("sourceName", event.target.value)}
      />
      <TextField
        id="wallet-effective-date"
        label="Effective date"
        type="date"
        required
        value={details.effectiveDate}
        onChange={(event) => onChange("effectiveDate", event.target.value)}
      />
    </div>
  );
}
