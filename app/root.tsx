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
          content="Discover the top 3 restaurants serving your favorite food near you. Just enter your craving and location in our free AI-powered app, and start your culinary adventure today!"
        />

        <meta
          property="og:title"
          content="Cule Filo - AI-powered restaurant search engine"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://culefilo.pages.dev" />
        <meta property="og:site_name" content="Cule Filo" />
        <meta
          property="og:description"
          content="Discover the top 3 restaurants serving your favorite food near you. Just enter your craving and location in our free AI-powered app, and start your culinary adventure today!"
        />

        <title>Cule Filo - AI-powered restaurant search engine</title>

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
