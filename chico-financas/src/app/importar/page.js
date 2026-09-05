import ImportadorExtrato from "./ImportadorExtrato";

export default async function Importar({ searchParams }) {
  const sp = await searchParams;
  const importadas = sp.importadas;

  return (
    <div className="wrap">
      <h1>Importar extrato</h1>
      <p className="sub">Traga o extrato de conta do Mercado Pago em vez de lançar cada saída na mão.</p>
      {importadas !== undefined && (
        <div className="receipt-highlight teal" style={{ marginBottom: 20 }}>
          <span className="value">{importadas} lançamento{importadas === "1" ? "" : "s"} importado{importadas === "1" ? "" : "s"} com sucesso.</span>
        </div>
      )}
      <ImportadorExtrato />
    </div>
  );
}
