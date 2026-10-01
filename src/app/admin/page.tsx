import { cookies } from 'next/headers';
import AdminClient from './AdminClient';
import { getDashboardStats } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin_auth')?.value === 'true';
    
    let stats = null;
    if (isAuthenticated) {
        stats = await getDashboardStats();
    }
    
    return <AdminClient isAuthenticated={isAuthenticated} initialStats={stats} />;
}
