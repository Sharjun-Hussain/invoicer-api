import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/db';
import Plan from '../../../../models/Plan';
import User from '../../../../models/User';
import { verifyJwt } from '../../../../lib/auth';
export async function POST(req) {
  await connectToDatabase();

  try {
    // 1. Auth
    const token = req.headers.get('authorization')?.split(' ')[1];
    const decoded = verifyJwt(token);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(decoded.id);
    const plan = await Plan.findOne({ id: user.subscription.planId });

    // 2. Reset Logic (Safety check in case they didn't hit /plan endpoint recently)
    const now = new Date();
    const lastReset = new Date(user.usage.lastResetDate);
    
    if (now.getMonth() !== lastReset.getMonth()) {
      user.usage.invoiceCount = 0;
      user.usage.lastResetDate = now;
      await user.save();
    }

    // 3. STOP if Limit Reached
    // (If limit is NOT -1 AND usage >= limit)
    if (plan.limits.invoices !== -1 && user.usage.invoiceCount >= plan.limits.invoices) {
      return NextResponse.json(
        { 
          success: false, 
          error: "LIMIT_REACHED",
          message: "You have reached your monthly invoice limit. Please upgrade." 
        }, 
        { status: 403 }
      );
    }

    // 4. Increment Count (The "Fear" Mechanic)
    user.usage.invoiceCount += 1;
    await user.save();

    // 5. Return Success
    return NextResponse.json({
      success: true,
      message: "Invoice generated",
      invoicesUsed: user.usage.invoiceCount,
      remaining: plan.limits.invoices === -1 ? 'Unlimited' : plan.limits.invoices - user.usage.invoiceCount
    });

  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error' }, { status: 500 });
  }
}