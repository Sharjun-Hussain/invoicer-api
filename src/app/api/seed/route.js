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
      limits: {
        invoices: 50,
        clients: 20,
        items: 50,
        teamMembers: 1,
        exportPDF: true,
        customTemplates: false
      },
      marketingFeatures: ["50 invoices/month", "20 clients", "50 items", "Basic templates", "1 user"]
    },
    {
      id: "pro",
      name: "Pro",
      price: 999,
      limits: {
        invoices: -1,
        clients: 100,
        items: 500,
        teamMembers: 3,
        exportPDF: true,
        customTemplates: true
      },
      marketingFeatures: ["Unlimited invoices", "100 clients", "500 items", "Custom templates", "No Ads", "3 Team members", "Priority support"]
    },
    {
      id: "premium",
      name: "Premium",
      price: 2499,
      limits: {
        invoices: -1,
        clients: -1,
        items: -1,
        teamMembers: 10,
        exportPDF: true,
        customTemplates: true
      },
      marketingFeatures: ["Unlimited everything", "No Ads", "10 Team members", "24/7 VIP support", "Custom branding"]
    }
  ];

  await Plan.deleteMany({}); // Clear old plans
  await Plan.insertMany(plans);

  return NextResponse.json({ success: true, message: "Plans seeded!" });
}