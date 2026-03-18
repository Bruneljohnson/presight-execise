import { NavLink } from "react-router-dom";

const links: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "People", end: true },
  { to: "/stream", label: "Stream" },
  { to: "/worker", label: "Worker" },
];

export default function NavBar() {
  return (
    <nav className="flex gap-6 px-6 py-3 bg-primary text-primary-foreground text-sm font-medium">
      {links.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => isActive ? "text-secondary" : "hover:text-secondary/80"}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
