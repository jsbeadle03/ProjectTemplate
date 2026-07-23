"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDemoSession } from "@/context/demo-session-context";

const navigation = {
  employee: [
    { href: "/employee", label: "Home", shortLabel: "Home" },
    {
      href: "/employee/feedback/new",
      label: "Share feedback",
      shortLabel: "Share",
    },
    {
      href: "/employee/wall",
      label: "Feedback wall",
      shortLabel: "Wall",
    },
    {
      href: "/employee/responses",
      label: "My responses",
      shortLabel: "Responses",
    },
  ],
  manager: [
    { href: "/manager", label: "Dashboard", shortLabel: "Overview" },
    {
      href: "/manager/feedback",
      label: "Feedback",
      shortLabel: "Feedback",
    },
    {
      href: "/manager/action-queue",
      label: "Action queue",
      shortLabel: "Queue",
    },
  ],
};

function isActivePath(pathname, href) {
  if (href === "/employee" || href === "/manager") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logOut } = useDemoSession();
  const items = navigation[user.role];

  function handleLogOut() {
    logOut();
    router.push("/");
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link
          className="brand sidebar-brand"
          href={user.role === "manager" ? "/manager" : "/employee"}
        >
          <span className="brand-mark" aria-hidden="true" />
          <span>Waflé</span>
        </Link>

        <div className="demo-notice">
          <span className="demo-dot" aria-hidden="true" />
          Demo workspace
        </div>

        <nav className="side-nav" aria-label={`${user.role} navigation`}>
          {items.map((item) => (
            <Link
              className={isActivePath(pathname, item.href) ? "active" : ""}
              href={item.href}
              key={item.href}
            >
              <span className="nav-marker" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-profile">
          <div className="avatar" aria-hidden="true">
            {user.displayName
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </div>
          <div>
            <strong>{user.displayName}</strong>
            <span>{user.role === "manager" ? "Manager demo" : "Employee demo"}</span>
          </div>
          <button className="logout-link" onClick={handleLogOut} type="button">
            Log out
          </button>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="topbar">
          <Link
            className="brand brand-mobile"
            href={user.role === "manager" ? "/manager" : "/employee"}
          >
            <span className="brand-mark" aria-hidden="true" />
            <span>Waflé</span>
          </Link>
          <span className="topbar-privacy">
            <span className="privacy-orbit small" aria-hidden="true" />
            Privacy-first demo
          </span>
          <button className="topbar-avatar" onClick={handleLogOut} type="button">
            {user.displayName
              .split(" ")
              .map((part) => part[0])
              .join("")}
            <span className="sr-only">Log out</span>
          </button>
        </header>
        <main className="page-container">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label={`${user.role} mobile navigation`}>
        {items.map((item) => (
          <Link
            className={isActivePath(pathname, item.href) ? "active" : ""}
            href={item.href}
            key={item.href}
          >
            <span className="mobile-nav-marker" aria-hidden="true" />
            {item.shortLabel}
          </Link>
        ))}
      </nav>
    </div>
  );
}
