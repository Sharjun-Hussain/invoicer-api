import "./globals.css";

export const metadata = {
    title: "Invoicer Admin",
    description: "Admin Dashboard for Invoicer App",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="antialiased bg-slate-50 text-slate-900">
                {children}
            </body>
        </html>
    );
}
