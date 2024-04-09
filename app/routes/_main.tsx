import { Outlet } from '@remix-run/react';

import Header from '~/components/Header';
import Tabs from '~/components/Tabs';
import Footer from '~/components/Footer';

export default function MainLayout() {
  return (
    <>
      <main className="min-screen-2 m-auto flex max-w-3xl flex-col  gap-4 p-4">
        <Header />
        <Tabs />
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
