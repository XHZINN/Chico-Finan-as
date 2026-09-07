"use client";

import { useEffect, useState } from "react";
import ImportadorExtrato from "./ImportadorExtrato";

export default function ImportModal() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aberto]);

  return (
    <>
      <button type="button" className="btn-link" onClick={() => setAberto(true)}>
        Importar extrato
      </button>

      {aberto && (
        <div className="modal-overlay" onClick={() => setAberto(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Importar extrato</h2>
              <button type="button" className="modal-close" onClick={() => setAberto(false)} title="fechar">×</button>
            </div>
            <p className="sub">Traga o extrato de conta do Mercado Pago em vez de lançar cada saída na mão.</p>
            <ImportadorExtrato />
          </div>
        </div>
      )}
    </>
  );
}
