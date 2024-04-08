import { Outlet } from '@remix-run/react';

import Header from '~/components/Header';
import Tabs from '~/components/Tabs';
import Footer from '~/components/Footer';

export default function MainLayout() {
  return (
    <>
      <main className="min-screen-2 p-4 flex flex-col gap-4  max-w-3xl m-auto">
        <Header />
        <Tabs />
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
