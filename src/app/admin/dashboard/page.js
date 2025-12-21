"use client";
import { useEffect, useState } from 'react';

export default function DashboardHome() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading analytics...</div>;
    if (!stats) return <div className="p-8 text-center text-red-500">Failed to load dashboard data.</div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Users</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalUsers.toLocaleString()}</p>
                        <p className="text-slate-400 text-sm mt-2 font-normal">Registered accounts</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Subs</h3>
                        <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.activeSubscriptions.toLocaleString()}</p>
                        <p className="text-slate-400 text-sm mt-2 font-normal">Paid plan users</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Invoices</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalInvoices.toLocaleString()}</p>
                        <p className="text-slate-400 text-sm mt-2 font-normal">Across all users</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Revenue (MRR)</h3>
                        <p className="text-3xl font-bold text-emerald-600 mt-2">LKR {stats.totalRevenue.toLocaleString()}</p>
                        <p className="text-slate-400 text-sm mt-2 font-normal">Estimated monthly</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* User Growth Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-slate-800 font-bold mb-6">User Growth (Last 6 Months)</h3>
                    <div className="h-64 flex items-end justify-between gap-2 px-2">
                        {stats.growthTrend.map((item, i) => {
                            const maxUsers = Math.max(...stats.growthTrend.map(t => t.users), 1);
                            const height = (item.users / maxUsers) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center group">
                                    <div className="relative w-full flex justify-center items-end h-48">
                                        <div
                                            className="w-4/5 bg-indigo-100 group-hover:bg-indigo-500 transition-all rounded-t-lg relative"
                                            style={{ height: `${height}%` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                {item.users} users
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-500 mt-3 font-medium">{item.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Plan Distribution */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-slate-800 font-bold mb-6">Plan Distribution</h3>
                    <div className="flex items-center justify-between h-64">
                        <div className="flex-1 space-y-4">
                            {stats.planBreakdown.map((plan, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }}></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-600 capitalize">{plan.name}</span>
                                            <span className="font-bold text-slate-900">{plan.count}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-1000"
                                                style={{
                                                    width: `${(plan.count / stats.totalUsers) * 100}%`,
                                                    backgroundColor: plan.color
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="w-32 h-32 ml-8 relative flex items-center justify-center">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                {stats.planBreakdown.reduce((acc, plan, i) => {
                                    const percentage = (plan.count / stats.totalUsers) * 100;
                                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                                    const strokeDashoffset = -acc.offset;
                                    acc.elements.push(
                                        <circle
                                            key={i}
                                            cx="18" cy="18" r="16"
                                            fill="none"
                                            stroke={plan.color}
                                            strokeWidth="4"
                                            strokeDasharray={strokeDasharray}
                                            strokeDashoffset={strokeDashoffset}
                                        />
                                    );
                                    acc.offset += percentage;
                                    return acc;
                                }, { elements: [], offset: 0 }).elements}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xs text-slate-400">Total</span>
                                <span className="text-lg font-bold text-slate-900">{stats.totalUsers}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

