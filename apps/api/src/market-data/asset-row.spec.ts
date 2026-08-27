import { normalizeAssetRow, RawAssetRow } from './asset-row';

describe('normalizeAssetRow', () => {
  it('maps a fully-populated row, uppercasing ticker', () => {
    const row: RawAssetRow = {
      ticker: 'bbas3',
      sector: 'FINANCIAL',
      subSector: 'BANCOS',
      investmentStyle: 'DIVIDENDS',
      riskRating: 'A',
      assetType: 'EQUITY',
    };

    expect(normalizeAssetRow(row)).toEqual({
      ticker: 'BBAS3',
      sector: 'FINANCIAL',
      subSector: 'BANCOS',
      investmentStyle: 'DIVIDENDS',
      riskRating: 'A',
      assetType: 'EQUITY',
    });
  });

  it('passes sector/subSector through verbatim, including mixed case and accents', () => {
    const row: RawAssetRow = {
      ticker: 'VALE3',
      sector: 'Material',
      subSector: 'Mineração',
      investmentStyle: undefined,
      riskRating: undefined,
      assetType: undefined,
    };

    const result = normalizeAssetRow(row);

    expect(result.sector).toBe('Material');
    expect(result.subSector).toBe('Mineração');
  });

  it('throws on an unrecognised riskRating, naming the column and value', () => {
    const row: RawAssetRow = {
      ticker: 'PETR4',
      sector: undefined,
      subSector: undefined,
      investmentStyle: undefined,
      riskRating: 'Z',
      assetType: undefined,
    };

    expect(() => normalizeAssetRow(row)).toThrow(/riskRating/);
    expect(() => normalizeAssetRow(row)).toThrow(/Z/);
  });

  it('throws on a leftover-Portuguese investmentStyle rather than silently nulling it', () => {
    const row: RawAssetRow = {
      ticker: 'ITSA4',
      sector: undefined,
      subSector: undefined,
      investmentStyle: 'DIVIDENDOS',
      riskRating: undefined,
      assetType: undefined,
    };

    expect(() => normalizeAssetRow(row)).toThrow(/investmentStyle/);
    expect(() => normalizeAssetRow(row)).toThrow(/DIVIDENDOS/);
  });

  it('maps an empty riskRating to explicit null, distinct from an absent one leaving the key out entirely', () => {
    const emptyRow: RawAssetRow = {
      ticker: 'WEGE3',
      sector: undefined,
      subSector: undefined,
      investmentStyle: undefined,
      riskRating: '',
      assetType: undefined,
    };
    const absentRow: RawAssetRow = {
      ticker: 'WEGE3',
      sector: undefined,
      subSector: undefined,
      investmentStyle: undefined,
      riskRating: undefined,
      assetType: undefined,
    };

    expect(normalizeAssetRow(emptyRow).riskRating).toBeNull();
    expect('riskRating' in normalizeAssetRow(absentRow)).toBe(false);
  });
});
