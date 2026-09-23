import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

import { SidebarNav } from './SidebarNav';

function renderAt(pathname: string) {
  usePathnameMock.mockReturnValue(pathname);
  render(<SidebarNav />);
}

function link(name: RegExp) {
  return screen.getByRole('link', { name });
}

describe('SidebarNav', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders every nav item, including Data sources', () => {
    renderAt('/');

    expect(link(/dashboard/i)).toHaveAttribute('href', '/');
    expect(link(/holdings/i)).toHaveAttribute('href', '/holdings');
    expect(link(/data sources/i)).toHaveAttribute('href', '/data-sources');
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('marks only Data sources as the current page on /data-sources', () => {
    renderAt('/data-sources');

    expect(link(/data sources/i)).toHaveAttribute('aria-current', 'page');
    expect(link(/dashboard/i)).not.toHaveAttribute('aria-current');
    expect(link(/holdings/i)).not.toHaveAttribute('aria-current');
  });

  it('marks only Dashboard as the current page on /', () => {
    renderAt('/');

    expect(link(/dashboard/i)).toHaveAttribute('aria-current', 'page');
    expect(link(/holdings/i)).not.toHaveAttribute('aria-current');
    expect(link(/data sources/i)).not.toHaveAttribute('aria-current');
  });

  it('marks only Holdings as the current page on /holdings', () => {
    renderAt('/holdings');

    expect(link(/holdings/i)).toHaveAttribute('aria-current', 'page');
    expect(link(/dashboard/i)).not.toHaveAttribute('aria-current');
    expect(link(/data sources/i)).not.toHaveAttribute('aria-current');
  });

  it('keeps a nested route under its section, matching by prefix', () => {
    renderAt('/holdings/ABEV3');

    expect(link(/holdings/i)).toHaveAttribute('aria-current', 'page');
    expect(link(/dashboard/i)).not.toHaveAttribute('aria-current');
  });
});
