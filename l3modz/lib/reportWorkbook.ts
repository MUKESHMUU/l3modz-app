import ExcelJS from 'exceljs';

const DATE_HEADERS = new Set(['Created', 'Registered']);
const NUMBER_HEADERS = new Set(['Total', 'Price', 'Stock', 'Images']);

function worksheetName(type: string) {
  const name = type.charAt(0).toUpperCase() + type.slice(1);
  return name.slice(0, 31) || 'Report';
}

export function getReportFilename(type: string, date = new Date()) {
  return `l3modz-${type}-report-${date.toISOString().slice(0, 10)}.xlsx`;
}

export async function createReportWorkbook(
  type: string,
  headers: string[],
  rows: unknown[][]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'L3Modz';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(worksheetName(type));
  worksheet.addRow(headers);
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEFEFEF' },
  };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const row of rows) {
    const excelRow = worksheet.addRow(row);
    row.forEach((value, index) => {
      const header = headers[index];
      const cell = excelRow.getCell(index + 1);
      if (DATE_HEADERS.has(header) && value) {
        cell.value = value instanceof Date ? value : new Date(String(value));
        cell.numFmt = 'yyyy-mm-dd hh:mm';
      } else if (NUMBER_HEADERS.has(header) && typeof value === 'number') {
        cell.numFmt = header === 'Total' || header === 'Price' ? '#,##0.00' : '#,##0';
      }
    });
  }

  worksheet.columns.forEach((column, index) => {
    const values = [headers[index], ...rows.map((row) => row[index])]
      .map((value) => String(value ?? ''))
      .map((value) => value.length);
    column.width = Math.min(40, Math.max(12, Math.max(...values, 0) + 2));
  });

  return workbook.xlsx.writeBuffer();
}
