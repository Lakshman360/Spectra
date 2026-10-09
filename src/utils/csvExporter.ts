/**
 * Safe CSV Export Utility for SPECTRA
 *
 * Implements:
 * 1. UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility.
 * 2. Proper escaping of quotes, commas, and newlines.
 * 3. Protection against CSV Formula Injection (CWE-1236) by neutralizing
 *    leading '=', '+', '-', '@', '\t', '\r'.
 * 4. Preservation of student roll numbers as explicit text strings.
 */

/**
 * Escapes a single cell value for CSV output and prevents formula injection.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // Check for CSV Formula Injection triggers
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaTriggers.some((prefix) => str.startsWith(prefix))) {
    // Prefix with single quote to force spreadsheet programs to treat as text
    str = `'${str}`;
  }

  // Double any existing double-quotes
  const escaped = str.replace(/"/g, '""');

  // Wrap every field in double quotes
  return `"${escaped}"`;
}

/**
 * Generates a properly formatted CSV string from headers and row records.
 */
export function generateCsvString(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));

  // Prepend UTF-8 Byte Order Mark (BOM)
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a secure browser download of a CSV file.
 */
export function downloadCsvFile(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): boolean {
  try {
    const csvContent = generateCsvString(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up temporary object URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error('Failed to export CSV file:', err);
    return false;
  }
}
