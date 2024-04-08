import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';

import '~/index.css';
import LoadingBar from './components/LoadingBar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
        />
        <meta
          name="description"
          content="Search for your favorite meal near you, quickly, enhanced by AI and for free."
        />

        <meta property="og:title" content="Cule filo" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://culefilo.pages.dev" />
        <meta property="og:site_name" content="Cule filo" />
        <meta
          property="og:description"
          content="Search for your favorite meal near you, quickly, enhanced by AI and for free."
        />

        <title>Cule filo</title>

        <Meta />
        <Links />
      </head>
      <body>
        <LoadingBar />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
