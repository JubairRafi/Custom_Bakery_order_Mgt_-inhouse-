import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/actions/auth';
import Sidebar, { adminLinks } from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();

    if (!user) redirect('/login');
    if (user.role !== 'admin') redirect('/dashboard');

    return (
        <div className="min-h-screen bg-background">
            <Sidebar links={adminLinks} userName={user.name} userRole="admin" />
            <main className="main-content" style={{ marginLeft: '260px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <NotificationBell />
                </div>
                {children}
            </main>
        </div>
    );
}
