export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

function escapeCsvValue(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsv<T>(data: T[], columns: CsvColumn<T>[], filename: string): void {
  const headerRow = columns.map((col) => escapeCsvValue(col.header)).join(',');
  const dataRows = data.map((row) =>
    columns.map((col) => escapeCsvValue(col.accessor(row))).join(','),
  );
  const csvContent = [headerRow, ...dataRows].join('\r\n');

  // BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
