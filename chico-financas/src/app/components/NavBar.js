"use client";

import { usePathname } from "next/navigation";
import { logout } from "../login/actions";

const LINKS = [
  { href: "/", label: "Painel" },
  { href: "/recorrentes", label: "Recorrentes & Custos" },
  { href: "/metas", label: "Metas" },
  { href: "/investimentos", label: "Investimentos" },
];

export default function NavBar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="navbar">
      {LINKS.map((link) => {
        const ativo = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <a key={link.href} href={link.href} className={ativo ? "navbar-link active" : "navbar-link"}>
            {link.label}
          </a>
        );
      })}
      <form action={logout} style={{ marginLeft: "auto" }}>
        <button type="submit" className="navbar-link" style={{ background: "none", border: "none", font: "inherit", cursor: "pointer" }}>sair</button>
      </form>
    </nav>
  );
}
