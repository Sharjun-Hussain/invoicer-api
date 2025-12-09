import { NextResponse } from 'next/server';
import { verifyJwt } from '../../../lib/auth';
import connectToDatabase from '../../../lib/db';
import Plan from '../../../models/Plan';
import User from '../../../models/User';

export async function GET(req) {
  await dbConnect();

  try {
    // 1. Auth Check (Mocking your verify logic)
    const token = req.headers.get('authorization')?.split(' ')[1];
    const decoded = verifyJwt(token); // You need to implement/use your existing verify
    if (!decoded) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const userId = decoded.id;
    const user = await User.findById(userId);
    const plan = await Plan.findOne({ id: user.subscription.planId });

    // 2. CHECK RESET LOGIC (Is it a new month?)
    const now = new Date();
    const lastReset = new Date(user.usage.lastResetDate);

    // If current month/year is different from last reset
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      user.usage.invoiceCount = 0;
      user.usage.lastResetDate = now;
      await user.save();
    }

    // 3. Get All Plans (for the pricing UI)
    const allPlans = await Plan.find({}).sort({ price: 1 });

    // 4. Construct the Exact JSON Response
    return NextResponse.json({
      success: true,
      subscription: {
        plan: user.subscription.planId,
        status: user.subscription.status,
        invoicesLimit: plan.limits.invoices, // e.g. 50
        invoicesUsed: user.usage.invoiceCount, // e.g. 12
        features: {
          customTemplates: plan.limits.customTemplates,
          exportPDF: plan.limits.exportPDF,
          teamMembers: plan.limits.teamMembers,
          // Add other flags...
        }
      },
      availablePlans: allPlans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency,
        billingCycle: "monthly",
        features: p.marketingFeatures
      }))
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}