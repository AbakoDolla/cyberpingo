import { Outlet } from 'react-router-dom';

import { Navbar } from '@/components/navbar/Navbar';
import { Sidebar } from '@/components/sidebar/Sidebar';

/** Shell shared by every authenticated screen. */
export const AppLayout = (): JSX.Element => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  </div>
);
