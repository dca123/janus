import { cssBundleHref } from '@remix-run/css-bundle';
import type { LinksFunction } from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from '@remix-run/react';
import styles from './tailwind.css';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: styles },
  ...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg',
  },
];
export function ErrorBoundary() {
  const error = useRouteError() as Error;
  console.error(error);
  return (
    <html>
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body className="container mx-auto dark py-8 px-4">
        <h1 className="text-3xl">Error !</h1>
        <p>{error.message}</p>
        {/* add the UI you want your users to see */}
        <Scripts />
      </body>
    </html>
  );
}
export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="container mx-auto dark py-8 px-4">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
