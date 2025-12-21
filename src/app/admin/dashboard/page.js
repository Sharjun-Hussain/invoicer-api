export default function DashboardHome() {
    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Users</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">1,234</p>
                    <p className="text-green-600 text-sm mt-2 flex items-center gap-1 font-medium">
                        <span>↑ 12%</span> <span className="text-slate-400 font-normal">from last month</span>
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Subscriptions</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">856</p>
                    <p className="text-green-600 text-sm mt-2 flex items-center gap-1 font-medium">
                        <span>↑ 5%</span> <span className="text-slate-400 font-normal">from last month</span>
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Revenue (MRR)</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">LKR 450,000</p>
                    <p className="text-green-600 text-sm mt-2 flex items-center gap-1 font-medium">
                        <span>↑ 8%</span> <span className="text-slate-400 font-normal">from last month</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
