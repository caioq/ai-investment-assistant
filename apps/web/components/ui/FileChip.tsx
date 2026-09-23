export type FileChipKind = 'csv' | 'pdf';

export interface FileChipProps {
  /** The attached file's name, ellipsis-truncated when it doesn't fit. */
  name: string;
  /** Secondary line, e.g. "12 KB · 24 rows · 5 columns" or "240 KB · 8 pages". */
  meta: string;
  kind: FileChipKind;
  onReplace: () => void;
  onRemove: () => void;
}

const ACTION_BUTTON_STYLE = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
} as const;

export function FileChip({ name, meta, kind, onReplace, onRemove }: FileChipProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--bg-card-alt)',
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: 'var(--navy)',
          color: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.04em',
          flexShrink: 0,
        }}
      >
        {kind.toUpperCase()}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{meta}</div>
      </div>
      <button
        type="button"
        // Named per file: several chips can share a screen, and a bare
        // "Replace"/"×" wouldn't say which file it acts on.
        aria-label={`Replace ${name}`}
        onClick={onReplace}
        style={{
          ...ACTION_BUTTON_STYLE,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          padding: '6px 8px',
        }}
      >
        Replace
      </button>
      <button
        type="button"
        aria-label={`Remove ${name}`}
        onClick={onRemove}
        style={{
          ...ACTION_BUTTON_STYLE,
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          padding: '4px 8px',
          lineHeight: 1,
        }}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
