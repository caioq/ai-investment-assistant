'use client';

import { useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';

export type DropZoneAccept = '.csv' | '.pdf';

export interface DropZoneProps {
  /** The only extension this zone accepts; anything else is rejected, never attached. */
  accept: DropZoneAccept;
  /** Visible headline, also the start of the control's accessible name. */
  label: string;
  /** Secondary line under the label (e.g. the expected columns). */
  hint: ReactNode;
  onFile: (file: File) => void;
  /** Called instead of `onFile` when the file's extension doesn't match `accept`. */
  onReject: (message: string) => void;
}

const FORMAT_LABEL: Record<DropZoneAccept, string> = {
  '.csv': 'CSV',
  '.pdf': 'PDF',
};

export function DropZone({ accept, label, hint, onFile, onReject }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const format = FORMAT_LABEL[accept];

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(accept)) {
      onReject(`${file.name} is not a ${format} file.`);
      return;
    }
    onFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragOver(false);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragOver(false);
    handleFile(event.dataTransfer?.files?.[0]);
  }

  const zoneStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
    padding: '36px 24px',
    borderRadius: 14,
    cursor: 'pointer',
    font: 'inherit',
    transition: 'border-color 150ms ease, background 150ms ease',
    border: `1.5px dashed ${dragOver ? 'var(--blue)' : 'var(--border)'}`,
    background: dragOver ? 'color-mix(in srgb, var(--blue) 8%, transparent)' : 'var(--bg-card-alt)',
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          // Reset so re-selecting the same file still fires `change`.
          event.target.value = '';
        }}
      />
      <button
        type="button"
        // The accessible name has to state the accepted format (spec →
        // Accessibility), so it's authored here rather than left to the
        // visible label alone.
        aria-label={`${label} — ${format} only`}
        data-drag-over={dragOver ? 'true' : 'false'}
        className="outline-none focus-visible:border-[var(--blue)] focus-visible:shadow-[0_0_0_3px_rgba(47,111,237,0.14)]"
        style={zoneStyle}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            // preventDefault stops the browser's own synthetic click on the
            // button, so the picker opens exactly once per keypress.
            event.preventDefault();
            openPicker();
          }
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--blue)',
          }}
        >
          ↑
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginTop: 12,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 4 }}>{hint}</span>
      </button>
    </>
  );
}
