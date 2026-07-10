"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Toast({ mensagem }) {
  const [visivel, setVisivel] = useState(!!mensagem);
  const router = useRouter();

  useEffect(() => {
    if (!mensagem) return;
    setVisivel(true);
    const timer = setTimeout(() => {
      setVisivel(false);
      // limpa o ?erro= da URL depois de sumir, pra não reaparecer num refresh
      router.replace(window.location.pathname + window.location.search.replace(/[?&]erro=[^&]*/, ""));
    }, 3500);
    return () => clearTimeout(timer);
  }, [mensagem]);

  if (!mensagem || !visivel) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--rust-bg)",
        color: "var(--rust)",
        border: "1px solid var(--rust)",
        borderRadius: 8,
        padding: "12px 20px",
        fontSize: 14,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        zIndex: 1000,
        animation: "fadein 0.2s ease-out",
      }}
    >
      {mensagem}
    </div>
  );
}