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

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const plan = user.subscription?.planId ? await Plan.findOne({ id: user.subscription.planId }) : null;

    const now = new Date();

    // Ensure usage object exists and lastResetDate is valid
    user.usage = user.usage || { invoiceCount: 0, lastResetDate: now };
    let lastReset = user.usage.lastResetDate ? new Date(user.usage.lastResetDate) : now;
    if (isNaN(lastReset.getTime())) lastReset = now;

    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      user.usage.invoiceCount = 0;
      user.usage.lastResetDate = now;
      await user.save();
    }

    const allPlans = await Plan.find({}).sort({ price: 1 });


    return NextResponse.json({
      success: true,
      subscription: {
        plan: user.subscription?.planId ?? null,
        status: user.subscription?.status ?? null,
        invoicesLimit: plan?.limits?.invoices ?? 0,
        invoicesUsed: user.usage?.invoiceCount ?? 0,
        features: {
          customTemplates: plan?.limits?.customTemplates ?? false,
          exportPDF: plan?.limits?.exportPDF ?? false,
          teamMembers: plan?.limits?.teamMembers ?? 0,
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