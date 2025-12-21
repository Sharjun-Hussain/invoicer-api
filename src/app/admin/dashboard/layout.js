"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin/login');
        } else {
            setAuthorized(true);
        }
    }, [router]);

    if (!authorized) return null;

    const navItems = [
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/dashboard/users', label: 'Users' },
        { href: '/admin/dashboard/plans', label: 'Plans' },
        { href: '/admin/dashboard/ads', label: 'Ads Manager' },
    ];

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
                        <span>⚡</span> Invoicer Admin
                    </h2>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`block px-4 py-2.5 rounded-lg font-medium transition-colors ${isActive
                                        ? 'bg-indigo-50 text-indigo-600'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={() => {
                            localStorage.removeItem('adminToken');
                            router.push('/admin/login');
                        }}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 ml-64">
                {children}
            </main>
        </div>
    );
}
