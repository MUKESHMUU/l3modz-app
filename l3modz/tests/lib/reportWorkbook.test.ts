import ExcelJS from 'exceljs';
import { createReportWorkbook, getReportFilename } from '@/lib/reportWorkbook';

describe('report workbook generation', () => {
  it('uses a descriptive XLSX filename', () => {
    expect(getReportFilename('orders', new Date('2026-10-11T12:30:00.000Z')))
      .toBe('l3modz-orders-report-2026-10-11.xlsx');
  });

  it('creates a real workbook with typed dates, numbers, Unicode, and empty reports', async () => {
    const buffer = await createReportWorkbook(
      'orders',
      ['Order ID', 'Created', 'Customer', 'Total'],
      [['abc-1', new Date('2026-10-11T12:30:00.000Z'), 'ग्राहक "One"', 1234.5]]
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet('Orders');

    expect(Buffer.from(buffer).subarray(0, 2).toString()).toBe('PK');
    expect(worksheet).toBeDefined();
    expect(worksheet?.getCell('A2').value).toBe('abc-1');
    expect(worksheet?.getCell('B2').value).toBeInstanceOf(Date);
    expect(worksheet?.getCell('D2').value).toBe(1234.5);
    expect(worksheet?.getCell('C2').value).toBe('ग्राहक "One"');
    expect(worksheet?.getCell('D2').numFmt).toBe('#,##0.00');

    const emptyBuffer = await createReportWorkbook('users', ['User ID', 'Name'], []);
    const emptyWorkbook = new ExcelJS.Workbook();
    await emptyWorkbook.xlsx.load(emptyBuffer);
    expect(emptyWorkbook.getWorksheet('Users')?.rowCount).toBe(1);
  });
});
