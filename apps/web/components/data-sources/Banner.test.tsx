import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Banner } from './Banner';

describe('Banner', () => {
  it('announces a success politely and renders its message', () => {
    render(
      <Banner
        kind="success"
        message="Imported 42 holdings — 12 added, 30 updated"
        onDismiss={() => {}}
      />,
    );

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('Imported 42 holdings — 12 added, 30 updated');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses role="alert" for an error', () => {
    render(
      <Banner kind="error" message="Upload failed: 413 Payload Too Large" onDismiss={() => {}} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed: 413 Payload Too Large');
  });

  it('calls onDismiss from an accessibly-named button', () => {
    const onDismiss = vi.fn();
    render(<Banner kind="success" message="Imported 8 assets" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
