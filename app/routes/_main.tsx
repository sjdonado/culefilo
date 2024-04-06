import { Outlet } from '@remix-run/react';

import Header from '~/components/Header';

export default function MainLayout() {
  return (
    <main className="h-screen p-4 max-w-3xl m-auto">
      <Header />
      <Outlet />
    </main>
  );
}
