import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/actions/auth';
import Sidebar, { customerLinks } from '@/components/Sidebar';

export default async function CustomerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();

    if (!user) redirect('/login');
    if (user.role === 'admin') redirect('/admin');

    return (
        <div className="min-h-screen bg-background">
            <Sidebar links={customerLinks} userName={user.name} userRole="customer" />
            <main className="main-content" style={{ marginLeft: '260px', padding: '24px' }}>
                {children}
            </main>
        </div>
    );
}
