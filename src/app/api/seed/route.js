// app/api/seed/route.js
import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/db';
import Plan from '../../../models/Plan';

export async function GET() {
  await connectToDatabase();

  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: 0,
      limits: { invoices: 50, customTemplates: false, exportPDF: true },
      marketingFeatures: ["50 invoices/month", "Basic templates", "1 user"]
    },
    {
      id: "pro",
      name: "Pro",
      price: 999,
      limits: { invoices: -1, customTemplates: true, exportPDF: true },
      marketingFeatures: ["Unlimited invoices", "Custom templates", "Priority support"]
    }
  ];

  await Plan.deleteMany({}); // Clear old plans
  await Plan.insertMany(plans);

  return NextResponse.json({ success: true, message: "Plans seeded!" });
}