import clsx from 'clsx';

import { NavLink, useSearchParams } from '@remix-run/react';

export default function Tabs() {
  const [searchParams] = useSearchParams();

  const Tab = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <NavLink
      to={`${to}?${searchParams.toString()}`}
      role="tab"
      className={({ isActive, isPending }) =>
        clsx('tab', {
          'tab-active': isActive,
          'pending cursor-not-allowed': isPending,
        })
      }
    >
      {children}
    </NavLink>
  );

  return (
    <>
      <div role="tablist" className="tabs tabs-lifted">
        <Tab to="/search">Search</Tab>
        <Tab to="/history">History</Tab>
      </div>
    </>
  );
}
