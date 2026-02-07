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
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">₹${(item.quantity * item.price).toFixed(2)}</td>
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
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .bill-container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px dashed #ddd; }
        .shop-logo { max-width: 120px; max-height: 80px; margin-bottom: 10px; }
        .shop-name { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
        .shop-details { font-size: 12px; color: #666; }
        .bill-info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px; }
        .customer-info { background: #f9f9f9; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
        th { text-align: left; padding: 8px 0; border-bottom: 2px solid #333; font-weight: 600; }
        th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
        th:last-child { text-align: right; }
        .totals { border-top: 2px dashed #ddd; padding-top: 10px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
        .total-row.final { font-size: 18px; font-weight: bold; border-top: 1px solid #333; margin-top: 5px; padding-top: 10px; }
        .payment-info { text-align: center; margin-top: 20px; padding: 10px; background: #e8f5e9; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px dashed #ddd; font-size: 12px; color: #666; }
        @media print { body { background: white; padding: 0; } .bill-container { box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="bill-container">
        <div class="header">
          ${data.shopLogo ? `<img src="${data.shopLogo}" alt="${data.shopName} Logo" class="shop-logo" />` : ""}
          <div class="shop-name">${data.shopName}</div>
          ${data.shopAddress ? `<div class="shop-details">${data.shopAddress}</div>` : ""}
          ${data.shopPhone ? `<div class="shop-details">Tel: ${data.shopPhone}</div>` : ""}
        </div>

        <div class="bill-info">
          <div>
            <strong>Bill No:</strong> ${data.billNumber}<br>
            <strong>Order:</strong> #${data.orderNumber}
          </div>
          <div style="text-align: right;">
            ${formatDate(data.date)}
            ${data.tableNumber ? `<br><strong>Table:</strong> ${data.tableNumber}` : ""}
          </div>
        </div>

        <div class="customer-info">
          <strong>Customer:</strong> ${data.customerName}<br>
          <strong>Phone:</strong> ${data.customerPhone}
          ${data.customerAddress ? `<br><strong>Address:</strong> ${data.customerAddress}` : ""}
        </div>

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
            <span>-₹${data.discount.toFixed(2)}</span>
          </div>
          ` : ""}
          <div class="total-row final">
            <span>Total</span>
            <span>₹${data.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-info">
          <strong>Payment:</strong> ${data.paymentMode.toUpperCase()}
          ${data.paymentMode === "upi" && data.upiId ? `<br><small>UPI: ${data.upiId}</small>` : ""}
        </div>

        <div class="footer">
          Thank you for your order!<br>
          Visit us again
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
      // Close the window after printing (optional)
      // printWindow.close();
    };
  } else {
    // Fallback: download as HTML file
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
