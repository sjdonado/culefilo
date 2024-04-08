import { Outlet } from '@remix-run/react';

import Header from '~/components/Header';
import Footer from '~/components/Footer';

export default function MainLayout() {
  return (
    <>
      <main className="min-screen-2 p-4 max-w-3xl m-auto">
        <Header />
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
