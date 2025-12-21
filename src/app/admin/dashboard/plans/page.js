"use client";
import { useEffect, useState } from 'react';

export default function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

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

    const handleEdit = (plan) => {
        setEditingPlan({ ...plan });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editingPlan)
            });

            if (res.ok) {
                await fetchPlans();
                setIsModalOpen(false);
                setEditingPlan(null);
            } else {
                const data = await res.json();
                alert(data.message || "Failed to update plan");
            }
        } catch (error) {
            console.error("Error updating plan:", error);
            alert("An error occurred while updating the plan");
        } finally {
            setSaving(false);
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

                            <button
                                onClick={() => handleEdit(plan)}
                                className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
                            >
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

            {/* Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900">Edit Plan: {editingPlan.name}</h2>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
                                <input
                                    type="text"
                                    value={editingPlan.name}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Price (LKR)</label>
                                <input
                                    type="number"
                                    value={editingPlan.price}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Invoices Limit</label>
                                    <input
                                        type="number"
                                        value={editingPlan.limits.invoices}
                                        onChange={(e) => setEditingPlan({
                                            ...editingPlan,
                                            limits: { ...editingPlan.limits, invoices: Number(e.target.value) }
                                        })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">-1 for unlimited</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Clients Limit</label>
                                    <input
                                        type="number"
                                        value={editingPlan.limits.clients}
                                        onChange={(e) => setEditingPlan({
                                            ...editingPlan,
                                            limits: { ...editingPlan.limits, clients: Number(e.target.value) }
                                        })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Items Limit</label>
                                    <input
                                        type="number"
                                        value={editingPlan.limits.items}
                                        onChange={(e) => setEditingPlan({
                                            ...editingPlan,
                                            limits: { ...editingPlan.limits, items: Number(e.target.value) }
                                        })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Team Members</label>
                                    <input
                                        type="number"
                                        value={editingPlan.limits.teamMembers}
                                        onChange={(e) => setEditingPlan({
                                            ...editingPlan,
                                            limits: { ...editingPlan.limits, teamMembers: Number(e.target.value) }
                                        })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-4 pt-2">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingPlan.limits.exportPDF}
                                        onChange={(e) => setEditingPlan({
                                            ...editingPlan,
                                            limits: { ...editingPlan.limits, exportPDF: e.target.checked }
                                        })}
                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">Export PDF</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingPlan.limits.customTemplates}
                                        onChange={(e) => setEditingPlan({
                                            ...editingPlan,
                                            limits: { ...editingPlan.limits, customTemplates: e.target.checked }
                                        })}
                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">Custom Templates</span>
                                </label>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 flex justify-end space-x-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

