import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { DataSourcesSummary } from "../../lib/types";
import { WalletDetailsFields } from "./WalletDetailsFields";
import { WalletTypeSelector } from "./WalletTypeSelector";
import { useWalletImportState } from "./useWalletImportState";

const DIVIDENDS_ONLY: DataSourcesSummary["wallets"] = [
  {
    walletType: "DIVIDENDS",
    effectiveDate: "2026-09-12T00:00:00.000Z",
    sourceName: "Meridian Research",
    positions: 10,
  },
];

/**
 * The wallet panel's header/details slot as US-4_T-2 will assemble it: the
 * selector and the detail fields over one `useWalletImportState`.
 */
function WalletHeader({
  wallets = DIVIDENDS_ONLY,
  onTypeChange = vi.fn(),
}: {
  wallets?: DataSourcesSummary["wallets"];
  onTypeChange?: (walletType: string) => void;
} = {}) {
  const state = useWalletImportState();

  return (
    <>
      <WalletTypeSelector
        wallets={wallets}
        value={state.walletType}
        onChange={(walletType) => {
          state.setWalletType(walletType);
          onTypeChange(walletType);
        }}
      />
      <WalletDetailsFields
        details={state.details}
        onChange={state.setDetail}
      />
    </>
  );
}

function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

describe("WalletTypeSelector", () => {
  it("renders the three wallet types, marking each dot Imported / Not imported", () => {
    render(
      <WalletTypeSelector
        wallets={DIVIDENDS_ONLY}
        value="DIVIDENDS"
        onChange={vi.fn()}
      />,
    );

    const options = screen.getAllByRole("button");
    expect(options).toHaveLength(3);
    expect(options.map((option) => option.textContent)).toEqual([
      "Dividends",
      "Overall Recommendation",
      "Small Caps",
    ]);

    expect(
      screen.getByRole("button", { name: /Dividends/ }),
    ).toContainElement(screen.getByLabelText("Imported"));
    expect(screen.getAllByLabelText("Not imported")).toHaveLength(2);
  });

  it("marks the selected option with aria-pressed and reports the change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <WalletTypeSelector
        wallets={DIVIDENDS_ONLY}
        value="DIVIDENDS"
        onChange={onChange}
      />,
    );

    const smallCaps = screen.getByRole("button", { name: /Small Caps/ });
    expect(smallCaps).toHaveAttribute("aria-pressed", "false");

    await user.click(smallCaps);

    expect(onChange).toHaveBeenCalledWith("SMALL_CAPS");

    rerender(
      <WalletTypeSelector
        wallets={DIVIDENDS_ONLY}
        value="SMALL_CAPS"
        onChange={onChange}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Small Caps/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the current version's date and position count, or the no-version sentence", () => {
    const { rerender } = render(
      <WalletTypeSelector
        wallets={DIVIDENDS_ONLY}
        value="DIVIDENDS"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Current version: Sep 12, 2026 · 10 positions"),
    ).toBeInTheDocument();

    rerender(
      <WalletTypeSelector
        wallets={DIVIDENDS_ONLY}
        value="SMALL_CAPS"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "No version imported yet. The AI Advisor cannot reference this wallet until one is.",
      ),
    ).toBeInTheDocument();
  });

  it("defaults the effective date to today and keeps a typed research house across a type change", async () => {
    const user = userEvent.setup();
    render(<WalletHeader />);

    expect(screen.getByLabelText("Effective date")).toHaveValue(todayIso());

    const house = screen.getByLabelText("Research house");
    expect(house).toHaveValue("");

    await user.type(house, "Meridian");
    expect(house).toHaveValue("Meridian");

    await user.click(screen.getByRole("button", { name: /Small Caps/ }));

    expect(screen.getByLabelText("Research house")).toHaveValue("Meridian");
    expect(screen.getByLabelText("Effective date")).toHaveValue(todayIso());
  });
});
