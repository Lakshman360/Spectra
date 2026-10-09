import { describe, it, expect } from 'vitest';
import { escapeCsvCell, generateCsvString } from '../utils/csvExporter';

describe('Safe CSV Exporter', () => {
  it('includes UTF-8 Byte Order Mark (BOM)', () => {
    const csv = generateCsvString(['Header'], [['Value']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('neutralizes formula injection characters (=, +, -, @)', () => {
    expect(escapeCsvCell('=CMD|dir')).toBe(`"'=CMD|dir"`);
    expect(escapeCsvCell('+SUM(A1:A10)')).toBe(`"'+SUM(A1:A10)"`);
    expect(escapeCsvCell('-100')).toBe(`"'-100"`);
    expect(escapeCsvCell('@SUM')).toBe(`"'@SUM"`);
  });

  it('correctly escapes quotes and commas', () => {
    expect(escapeCsvCell('Sharma, Aarav')).toBe(`"Sharma, Aarav"`);
    expect(escapeCsvCell('He said "Hello"')).toBe(`"He said ""Hello"""`);
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });

  it('preserves student roll numbers cleanly', () => {
    const roll = '259XA05308';
    expect(escapeCsvCell(roll)).toBe(`"${roll}"`);
  });
});
