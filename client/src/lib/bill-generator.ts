interface BillItem {
  name: string;
  quantity: number;
  price: number;
}

interface BillData {
  shopName: string;
  shopLogo?: string;
  shopAddress?: string;
  shopPhone?: string;
  billNumber: string;
  orderNumber: string;
  date: Date;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  tableNumber?: string;
  items: BillItem[];
  subtotal: number;
  deliveryCharge?: number;
  discount?: number;
  total: number;
  paymentMode: string;
  upiId?: string;
}

export function generateBillHTML(data: BillData): string {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const itemsHTML = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 4px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
        <td style="padding: 10px 4px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 4px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 10px 4px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">₹${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill - ${data.billNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; padding: 20px; }
        .bill-container { max-width: 420px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 24px; text-align: center; }
        .shop-logo { max-width: 90px; max-height: 60px; margin-bottom: 12px; border-radius: 8px; object-fit: contain; background: white; padding: 8px; }
        .shop-name { font-size: 22px; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.5px; }
        .shop-details { font-size: 11px; opacity: 0.9; line-height: 1.6; }
        .bill-info { display: flex; justify-content: space-between; padding: 16px 20px; background: #f8fafc; border-bottom: 1px dashed #cbd5e1; }
        .bill-info-box { font-size: 12px; line-height: 1.7; color: #475569; }
        .bill-info-box strong { color: #1e293b; }
        .bill-info-box:last-child { text-align: right; }
        .customer-info { margin: 16px 20px; padding: 14px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 10px; border-left: 4px solid #0ea5e9; }
        .customer-info-title { font-size: 11px; font-weight: 600; color: #0369a1; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .customer-info-text { font-size: 13px; color: #1e293b; line-height: 1.6; }
        .items-section { padding: 0 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { text-align: left; padding: 12px 4px; border-bottom: 2px solid #334155; font-weight: 600; color: #334155; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
        th:last-child { text-align: right; }
        .totals { background: #f8fafc; margin: 0 20px 16px; padding: 16px; border-radius: 10px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #64748b; }
        .total-row.final { font-size: 22px; font-weight: 700; color: #0f172a; border-top: 2px solid #334155; margin-top: 8px; padding-top: 12px; }
        .payment-info { margin: 0 20px 20px; padding: 14px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 10px; text-align: center; border: 1px solid #86efac; }
        .payment-info-text { color: #166534; font-weight: 600; font-size: 14px; }
        .payment-info small { color: #15803d; display: block; margin-top: 4px; }
        .footer { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 24px; text-align: center; }
        .powered-by { font-size: 14px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 10px; color: #60a5fa; }
        .thank-you { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
        .visit-info { font-size: 12px; opacity: 0.8; font-style: italic; }
        .divider { height: 1px; background: linear-gradient(90deg, transparent, #cbd5e1, transparent); margin: 0 20px; }
        @media print { 
          body { background: white; padding: 0; } 
          .bill-container { box-shadow: none; border-radius: 0; } 
        }
      </style>
    </head>
    <body>
      <div class="bill-container">
        <div class="header">
          ${data.shopLogo ? `<img src="${data.shopLogo}" alt="${data.shopName} Logo" class="shop-logo" />` : ""}
          <div class="shop-name">${data.shopName}</div>
          ${data.shopAddress ? `<div class="shop-details">${data.shopAddress}</div>` : ""}
          ${data.shopPhone ? `<div class="shop-details">📞 ${data.shopPhone}</div>` : ""}
        </div>

        <div class="bill-info">
          <div class="bill-info-box">
            <strong>Bill No:</strong> ${data.billNumber}<br>
            <strong>Order:</strong> #${data.orderNumber}
          </div>
          <div class="bill-info-box">
            <strong>Date:</strong> ${formatDate(data.date)}<br>
            ${data.tableNumber ? `<strong>Table:</strong> ${data.tableNumber}` : ""}
          </div>
        </div>

        <div class="divider"></div>

        <div class="customer-info">
          <div class="customer-info-title">Customer Details</div>
          <div class="customer-info-text">
            <strong>${data.customerName}</strong><br>
            📱 ${data.customerPhone}
            ${data.customerAddress ? `<br>📍 ${data.customerAddress}` : ""}
          </div>
        </div>

        <div class="items-section">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>₹${data.subtotal.toFixed(2)}</span>
          </div>
          ${data.deliveryCharge && data.deliveryCharge > 0 ? `
          <div class="total-row">
            <span>Delivery Charge</span>
            <span>₹${data.deliveryCharge.toFixed(2)}</span>
          </div>
          ` : ""}
          ${data.discount ? `
          <div class="total-row">
            <span>Discount</span>
            <span style="color: #16a34a;">-₹${data.discount.toFixed(2)}</span>
          </div>
          ` : ""}
          <div class="total-row final">
            <span>Total</span>
            <span>₹${data.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-info">
          <div class="payment-info-text">Payment: ${data.paymentMode.toUpperCase()}</div>
          ${data.paymentMode === "upi" && data.upiId ? `<small>UPI ID: ${data.upiId}</small>` : ""}
        </div>

        <div class="footer">
          <div class="powered-by">✨ Powered by Marwahi.in ✨</div>
          <div class="thank-you">Thank you for your order!</div>
          <div class="visit-info">Visit again for best experience</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function downloadBillPDF(data: BillData): void {
  const html = generateBillHTML(data);
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  } else {
    console.log("Popup blocked, downloading as HTML file");
    downloadBillAsHTML(data);
  }
}

export function downloadBillAsHTML(data: BillData): void {
  const html = generateBillHTML(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bill_${data.billNumber || 'order'}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadBillAsImage(data: BillData): void {
  const html = generateBillHTML(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bill_${data.billNumber}.html`;
  link.click();
  URL.revokeObjectURL(url);
}
