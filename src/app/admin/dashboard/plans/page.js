"use client";
import { useEffect, useState } from 'react';

export default function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch('/api/admin/plans', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setPlans(await res.json());
            }
        } catch (error) {
            console.error("Failed to fetch plans", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading plans...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Plan Management</h1>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm shadow-indigo-200">
                    + New Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-slate-900 capitalize">{plan.name}</h3>
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
                                    {plan.id}
                                </span>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 mb-6">
                                {plan.price === 0 ? 'Free' : `LKR ${plan.price}`}
                                {plan.price > 0 && <span className="text-sm text-slate-500 font-normal">/month</span>}
                            </div>

                            <div className="space-y-3 mb-8 border-t border-slate-100 pt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Invoices</span>
                                    <span className="font-medium text-slate-900">{plan.limits?.invoices === -1 || !plan.limits?.invoices ? 'Unlimited' : plan.limits.invoices}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Clients</span>
                                    <span className="font-medium text-slate-900">{plan.limits?.clients === -1 || !plan.limits?.clients ? 'Unlimited' : plan.limits.clients}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Items</span>
                                    <span className="font-medium text-slate-900">{plan.limits?.items === -1 || !plan.limits?.items ? 'Unlimited' : plan.limits.items}</span>
                                </div>
                            </div>

                            <button className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg transition-colors text-sm">
                                Edit Plan Details
                            </button>
                        </div>
                    </div>
                ))}

                {plans.length === 0 && (
                    <div className="col-span-3 text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">No plans found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
