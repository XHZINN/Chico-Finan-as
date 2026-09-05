import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

// registra o worker no thread principal — evita o import() dinâmico que o
// pdfjs tenta em runtime pra achar o worker (o Turbopack não empacota esse
// caminho corretamente no bundle do servidor)
globalThis.pdfjsWorker = pdfjsWorker;

const REGEX_DATA = /^(\d{2})-(\d{2})-(\d{4})$/;
const REGEX_ID = /^\d{9,15}$/;
const REGEX_VALOR = /^R\$\s*(-?[\d.]+,\d{2})$/;

const X_DATA_MAX = 80;
const X_DESCRICAO_MIN = 82;
const X_DESCRICAO_MAX = 196;
const X_ID_MIN = 196;
const X_ID_MAX = 260;
const X_VALOR_MIN = 280;
const X_VALOR_MAX = 340;
const TOLERANCIA_Y = 3;

function paraNumero(valorTexto) {
  return Number(valorTexto.replace(/\./g, "").replace(",", "."));
}

/**
 * Lê um PDF de extrato de conta do Mercado Pago e devolve os lançamentos
 * encontrados. Cada linha da tabela é ancorada pela célula de data (única
 * coluna com posição X previsível em toda linha, mesmo quando a descrição
 * quebra em várias linhas) — ID/valor sempre aparecem na mesma altura (Y)
 * da data; a descrição pode se espalhar acima/abaixo dessa altura.
 */
export async function parseExtratoMercadoPago(bytes) {
  const doc = await getDocument({ data: bytes }).promise;
  const lancamentos = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const itens = content.items
      .map(it => ({ str: it.str.trim(), x: it.transform[4], y: it.transform[5] }))
      .filter(it => it.str);

    const anchors = itens
      .filter(it => it.x < X_DATA_MAX && REGEX_DATA.test(it.str))
      .sort((a, b) => b.y - a.y);

    // cada linha da descrição pode aparecer bem acima/abaixo da própria
    // âncora (data) quando o texto quebra em várias linhas — o jeito
    // robusto de agrupar é achar, pra cada fragmento de texto na coluna
    // de descrição, qual âncora (data) da página está mais perto em Y.
    function ancoraMaisProxima(y) {
      let melhor = anchors[0];
      let menorDist = Math.abs(y - melhor.y);
      for (const a of anchors) {
        const dist = Math.abs(y - a.y);
        if (dist < menorDist) { melhor = a; menorDist = dist; }
      }
      return melhor;
    }

    // nenhuma descrição legítima passa muito além da própria linha — isso
    // também descarta o cabeçalho da tabela (que se repete em cada página)
    // e a caixa de resumo (saldo inicial/entradas/saídas), que ficam bem
    // acima da primeira linha de dados.
    const maiorAncoraY = anchors[0]?.y ?? Infinity;
    const menorAncoraY = anchors[anchors.length - 1]?.y ?? -Infinity;

    const descricaoPorAncora = new Map();
    itens
      .filter(it =>
        it.x >= X_DESCRICAO_MIN && it.x < X_DESCRICAO_MAX &&
        it.y <= maiorAncoraY + 20 && it.y >= menorAncoraY - 20
      )
      .forEach(it => {
        const ancora = ancoraMaisProxima(it.y);
        const lista = descricaoPorAncora.get(ancora) || [];
        lista.push(it);
        descricaoPorAncora.set(ancora, lista);
      });

    anchors.forEach((anchor) => {
      const idItem = itens.find(it =>
        it.x >= X_ID_MIN && it.x < X_ID_MAX &&
        Math.abs(it.y - anchor.y) <= TOLERANCIA_Y &&
        REGEX_ID.test(it.str)
      );
      const valorItem = itens.find(it =>
        it.x >= X_VALOR_MIN && it.x < X_VALOR_MAX &&
        Math.abs(it.y - anchor.y) <= TOLERANCIA_Y &&
        REGEX_VALOR.test(it.str)
      );
      const descricaoPartes = (descricaoPorAncora.get(anchor) || [])
        .sort((a, b) => b.y - a.y)
        .map(it => it.str);

      if (!idItem || !valorItem || descricaoPartes.length === 0) return;

      const [, dd, mm, yyyy] = anchor.str.match(REGEX_DATA);
      const valorMatch = valorItem.str.match(REGEX_VALOR);

      lancamentos.push({
        data: `${yyyy}-${mm}-${dd}`,
        descricao: descricaoPartes.join(" "),
        id_operacao: idItem.str,
        valor: paraNumero(valorMatch[1]),
      });
    });
  }

  return lancamentos;
}
