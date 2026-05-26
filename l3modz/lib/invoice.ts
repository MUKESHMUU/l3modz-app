import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import type { IOrder } from '@/models/Order';

type PdfBufferOptions = {
  invoiceNumber: string;
};

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: Date | string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getCompanyName() {
  return process.env.COMPANY_NAME || 'L3 MODZ';
}

function getCompanyContact() {
  return {
    email: process.env.COMPANY_SUPPORT_EMAIL || process.env.SMTP_FROM || 'support@l3modz.com',
    phone: process.env.COMPANY_SUPPORT_PHONE || process.env.WHATSAPP_SUPPORT_NUMBER || '+91 98431 99393',
    website: process.env.COMPANY_WEBSITE || 'l3modz.com',
  };
}

function getLogoPath() {
  const candidates = [
    path.join(process.cwd(), 'public', 'logo.png'),
    path.join(process.cwd(), 'frontend', 'public', 'logo.png'),
    path.join(process.cwd(), 'frontend', 'src', 'assets', 'Logo For PNG.png'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function drawKeyValue(doc: any, label: string, value: string, x: number, y: number, width = 250) {
  doc.fontSize(9).fillColor('#6b7280').text(label, x, y, { width });
  doc.fontSize(11).fillColor('#111827').text(value || '-', x, y + 12, { width });
}

function addTableRow(doc: any, columns: string[], y: number, columnWidths: number[]) {
  let x = 40;
  columns.forEach((column, index) => {
    doc.fontSize(10).fillColor('#111827').text(column, x, y, { width: columnWidths[index], align: index === 2 ? 'right' : 'left' });
    x += columnWidths[index];
  });
}

export async function generateInvoicePdfBuffer(order: IOrder, options: PdfBufferOptions) {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logoPath = getLogoPath();
    if (logoPath) {
      try {
        doc.image(logoPath, 40, 35, { width: 80 });
      } catch {
        // Fallback to text branding if the image cannot be embedded.
      }
    }

    doc
      .fillColor('#111827')
      .fontSize(20)
      .text(getCompanyName(), 140, 40, { align: 'left' })
      .fontSize(10)
      .fillColor('#4b5563')
      .text('Tax Invoice', 140, 66);

    doc.roundedRect(40, 95, 515, 78, 10).fillAndStroke('#f9fafb', '#e5e7eb');
    drawKeyValue(doc, 'Invoice Number', options.invoiceNumber, 55, 112, 220);
    drawKeyValue(doc, 'Invoice Date', formatDate(order.paidAt || order.createdAt), 290, 112, 160);
    drawKeyValue(doc, 'Order ID', String(order._id), 55, 150, 220);
    drawKeyValue(doc, 'Payment Status', order.isPaid ? 'Paid' : 'Pending', 290, 150, 160);

    const customer = order.guestInfo?.name || 'Customer';
    const contact = order.guestInfo?.email || order.guestInfo?.phone || '-';
    const shipping = order.shippingAddress;

    let y = 190;
    doc.fontSize(12).fillColor('#111827').text('Customer & Shipping Details', 40, y);
    y += 18;
    doc.roundedRect(40, y, 515, 92, 10).stroke('#e5e7eb');
    drawKeyValue(doc, 'Customer', customer, 55, y + 12, 220);
    drawKeyValue(doc, 'Contact', contact, 290, y + 12, 220);
    drawKeyValue(doc, 'Shipping Address', `${shipping?.addressLine1 || shipping?.street || '-'}${shipping?.addressLine2 ? `, ${shipping.addressLine2}` : ''}`, 55, y + 42, 460);
    drawKeyValue(doc, 'City / State / Pincode', `${shipping?.city || '-'} / ${shipping?.state || '-'} / ${shipping?.pincode || '-'}`, 55, y + 66, 460);

    y += 112;
    doc.fontSize(12).fillColor('#111827').text('Order Items', 40, y);
    y += 18;
    doc.roundedRect(40, y, 515, 24, 8).fillAndStroke('#f3f4f6', '#e5e7eb');
    addTableRow(doc, ['Item', 'Qty', 'Amount'], y + 7, [290, 80, 145]);
    y += 28;

    const items = Array.isArray(order.orderItems) ? order.orderItems : [];
    items.forEach((item) => {
      const rowHeight = 22;
      doc.roundedRect(40, y, 515, rowHeight, 0).stroke('#f3f4f6');
      addTableRow(doc, [item.name, String(item.quantity || 0), formatMoney(Number(item.price || 0) * Number(item.quantity || 0))], y + 6, [290, 80, 145]);
      y += rowHeight;
    });

    y += 10;
    doc.fontSize(12).fillColor('#111827').text('Summary', 40, y);
    y += 18;
    doc.roundedRect(40, y, 515, 90, 10).stroke('#e5e7eb');
    drawKeyValue(doc, 'Subtotal', formatMoney(order.totalPrice || 0), 55, y + 12, 150);
    drawKeyValue(doc, 'Payment Method', String(order.paymentMethod || '-'), 220, y + 12, 150);
    drawKeyValue(doc, 'Delivery Partner', String(order.deliveryPartner || '-'), 385, y + 12, 150);
    drawKeyValue(doc, 'AWB / Tracking', String(order.AWB_number || '-'), 55, y + 46, 220);
    drawKeyValue(doc, 'Estimated Delivery', formatDate(order.estimated_delivery || null), 290, y + 46, 220);

    y += 112;
    const contactInfo = getCompanyContact();
    doc
      .fontSize(9)
      .fillColor('#6b7280')
      .text(`Support: ${contactInfo.email} | ${contactInfo.phone} | ${contactInfo.website}`, 40, y, { width: 515, align: 'center' });

    doc.end();
  });
}
