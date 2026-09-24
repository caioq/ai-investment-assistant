export interface SourceCardProps {
  /** 1–4: the order the sources are meant to be imported in. */
  step: number;
  name: string;
  format: "CSV" | "PDF";
  description: string;
  /** `{date} · {n} assets`, `{n} of 3 wallets imported`, "Never imported", … */
  meta: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * One of the four `/data-sources` source cards (`specs/data-sources/spec.md`
 * → Presentation). Selecting a card is a *button press*, not navigation —
 * it reveals that source's import panel below — so this is a real
 * `<button type="button">` carrying `aria-pressed`, and the selected state
 * is conveyed by the `--blue` border and blue step circle *plus* that
 * attribute rather than by colour alone.
 *
 * Presentational only, with no `'use client'` of its own (same convention as
 * `Button`/`Card`/`Badge`): the selection state lives in whichever client
 * component renders it — here `DataSourcesPanel`.
 */
export function SourceCard({
  step,
  name,
  format,
  description,
  meta,
  selected,
  onSelect,
}: SourceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        font: "inherit",
        cursor: "pointer",
        background: "var(--bg-card)",
        borderRadius: 16,
        padding: "18px 18px 16px 18px",
        boxShadow: selected
          ? "0 0 0 3px color-mix(in srgb, var(--blue) 16%, transparent)"
          : "var(--shadow)",
        border: `1px solid ${selected ? "var(--blue)" : "var(--border)"}`,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            background: selected ? "var(--blue)" : "var(--bg-card-alt)",
            color: selected ? "#fff" : "var(--text-tertiary)",
            border: `1px solid ${selected ? "var(--blue)" : "var(--border)"}`,
          }}
        >
          {step}
        </span>
        <span
          style={{
            fontSize: 14.5,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {name}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
          }}
        >
          {format}
        </span>
      </span>
      <span
        style={{
          display: "block",
          fontSize: 12.5,
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          marginTop: 8,
        }}
      >
        {description}
      </span>
      <span
        style={{
          display: "block",
          fontSize: 11.5,
          color: "var(--text-tertiary)",
          marginTop: 14,
        }}
      >
        {meta}
      </span>
    </button>
  );
}
