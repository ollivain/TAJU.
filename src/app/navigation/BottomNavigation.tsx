import { NavLink } from "react-router-dom";
import { Squiggle } from "../../components/ui/Squiggle";

const items = [
  { to: "/sanat", label: "Sanat" },
  { to: "/loyda", label: "Löydä" },
  { to: "/tieda", label: "Tiedä" },
  { to: "/asetukset", label: "Asetukset" },
];

export function BottomNavigation() {
  return (
    <nav className="bottom-nav" aria-label="Päänavigaatio">
      <div className="bottom-nav__inner">
        {items.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `bottom-nav__item${isActive ? " is-active" : ""}`}
          >
            <span className="bottom-nav__label">{label}</span>
            <Squiggle className="bottom-nav__mark" weight={1.4} opacity={1} />
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
