import { NextResponse } from 'next/server';
import { verifyJwt } from '../../../lib/auth';
import connectToDatabase from '../../../lib/db';
import Plan from '../../../models/Plan';
import User from '../../../models/User';

export async function GET(req) {
  await connectToDatabase();

  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.id;
    const user = await User.findById(userId);
    const plan = await Plan.findOne({ id: user.subscription.planId });

    const now = new Date();
    const lastReset = new Date(user.usage.lastResetDate);

    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      user.usage.invoiceCount = 0;
      user.usage.lastResetDate = now;
      await user.save();
    }

    const allPlans = await Plan.find({}).sort({ price: 1 });


    return NextResponse.json({
      success: true,
      subscription: {
        plan: user.subscription.planId,
        status: user.subscription.status,
        invoicesLimit: plan.limits.invoices, 
        invoicesUsed: user.usage.invoiceCount,
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