"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Painel" },
  { href: "/recorrentes", label: "Recorrentes & Custos" },
  { href: "/metas", label: "Metas" },
  { href: "/investimentos", label: "Investimentos" },
];

export default function NavBar() {
  const pathname = usePathname();

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
    </nav>
  );
}
