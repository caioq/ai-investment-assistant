import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TemplateDownloadButton } from './TemplateDownloadButton';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockObjectUrl() {
  const createObjectURL = vi.fn(() => 'blob:mock-url');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL,
    revokeObjectURL,
  });
  return { createObjectURL, revokeObjectURL };
}

describe('TemplateDownloadButton', () => {
  it('creates and revokes an object URL and names the file assets-template.csv', async () => {
    const { createObjectURL, revokeObjectURL } = mockObjectUrl();
    const anchors: HTMLAnchorElement[] = [];
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = createElement(tagName, options);
      if (tagName === 'a') {
        anchors.push(element as HTMLAnchorElement);
      }
      return element;
    });

    render(<TemplateDownloadButton source="assets" />);

    await userEvent.click(screen.getByRole('button', { name: /download csv template/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(anchors).toHaveLength(1);
    expect(anchors[0].download).toBe('assets-template.csv');
    expect(anchors[0].href).toContain('blob:mock-url');
    expect(document.body.contains(anchors[0])).toBe(false);
  });

  it('names a wallet template after its wallet type', async () => {
    mockObjectUrl();
    const anchors: HTMLAnchorElement[] = [];
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = createElement(tagName, options);
      if (tagName === 'a') {
        anchors.push(element as HTMLAnchorElement);
      }
      return element;
    });

    render(<TemplateDownloadButton source="wallet" walletType="DIVIDENDS" />);

    await userEvent.click(screen.getByRole('button', { name: /download csv template/i }));

    expect(anchors[0].download).toBe('wallet-dividends-template.csv');
  });
});
