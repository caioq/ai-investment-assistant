export type BannerKind = 'success' | 'error';

export interface BannerProps {
  kind: BannerKind;
  message: string;
  onDismiss: () => void;
}

const KIND_STYLES: Record<BannerKind, { accent: string; icon: string }> = {
  success: { accent: 'var(--emerald)', icon: '✓' },
  error: { accent: 'var(--red)', icon: '!' },
};

/**
 * The post-import outcome strip for a data-sources panel. Success is
 * announced politely (`role="status"`), failure assertively
 * (`role="alert"`), and the ✓ / ! icon means the outcome never depends on
 * the tint alone (spec → Accessibility).
 */
export function Banner({ kind, message, onDismiss }: BannerProps) {
  const { accent, icon } = KIND_STYLES[kind];

  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 12px',
        borderRadius: 12,
        border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
        background: `color-mix(in srgb, ${accent} 10%, var(--bg-card))`,
        color: 'var(--text-primary)',
        fontSize: 13,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          borderRadius: '50%',
          background: accent,
          color: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1,
          padding: '4px 6px',
          color: 'var(--text-tertiary)',
        }}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
