import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// --- MAIN POST HANDLER ---
export async function POST(req) {
  try {
    const data = await req.json();
    console.log("Invoice received:", data);

const html = `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="text-align: center; margin-bottom: 20px;">📄 New Invoice Generated</h2>

    <h3>Invoice Details</h3>
    <table cellpadding="6" style="border-collapse: collapse; width: 100%;">
      <tr>
        <td><strong>Invoice No:</strong></td>
        <td>${data.invoice.number}</td>
      </tr>
      <tr>
        <td><strong>Date:</strong></td>
        <td>${data.invoice.date}</td>
      </tr>
      <tr>
        <td><strong>Payment Date:</strong></td>
        <td>${data.invoice.paymentDate}</td>
      </tr>
      <tr>
        <td><strong>Generated At:</strong></td>
        <td>${new Date(data.generatedAt).toLocaleString()}</td>
      </tr>
    </table>

    <br />

    <h3>Bill To</h3>
    <p>
      <strong>${data.billTo.name}</strong><br />
      ${data.billTo.address}<br />
      ${data.billTo.phone || ""}
    </p>

    <h3>Ship To</h3>
    <p>
      <strong>${data.shipTo.name}</strong><br />
      ${data.shipTo.address}<br />
      ${data.shipTo.phone || ""}
    </p>

    <h3>Your Company</h3>
    <p>
      <strong>${data.yourCompany.name}</strong><br />
      ${data.yourCompany.address}<br />
      ${data.yourCompany.phone}
    </p>

    <br />

    <h3>Items</h3>
    <table cellpadding="8" style="width:100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f4f4f4;">
          <th align="left">Item</th>
          <th align="right">Qty</th>
          <th align="right">Amount</th>
          <th align="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items
          .map(
            (item) => `
            <tr>
              <td>${item.name || "-"}</td>
              <td align="right">${item.quantity}</td>
              <td align="right">Rs. ${item.amount}</td>
              <td align="right">Rs. ${item.total}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>

    <br />

    <h3>Summary</h3>
    <table cellpadding="6" style="border-collapse: collapse; width: 50%;">
      <tr>
        <td><strong>Sub Total:</strong></td>
        <td>Rs. ${data.subTotal}</td>
      </tr>
      <tr>
        <td><strong>Tax (${data.taxPercentage}%):</strong></td>
        <td>Rs. ${data.taxAmount}</td>
      </tr>
      <tr>
        <td><strong>Grand Total:</strong></td>
        <td><strong>Rs. ${data.grandTotal}</strong></td>
      </tr>
    </table>

    <br />
    ${
      data.notes
        ? `<h3>Notes</h3><p>${data.notes}</p>`
        : ""
    }
    
    <br />
    <p style="font-size: 12px; color: gray; text-align: center;">
      Invoice email generated automatically by Inzeedo System.
    </p>
  </div>
`;


    await resend.emails.send({
      from: 'onboarding@resend.dev',
  to: 'sharjoonibnuhussain99@gmail.com',
      subject: "New Invoice Generated",
      html,
    });

    return new NextResponse(
      JSON.stringify({ download : "Successful" }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      }
    );
  } catch (err) {
    console.error("ERROR:", err);
    return new NextResponse(
      JSON.stringify({ ok: false, error: err.message }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// --- CORS PRE-FLIGHT HANDLER ---
export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}
