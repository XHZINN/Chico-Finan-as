function normalizar(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function escapeRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bateComPalavra(nomeNormalizado, palavra) {
  const palavraNormalizada = normalizar(palavra);
  if (!palavraNormalizada) return false;
  const regex = new RegExp(`\\b${escapeRegex(palavraNormalizada)}\\b`);
  return regex.test(nomeNormalizado);
}

/**
 * categorias: [{ id_categoria, palavras: [{ palavra }] }], já ordenadas
 * pela prioridade desejada (ex: criado_em asc).
 */
export function categorizar(nomeLancamento, categorias) {
  const nomeNormalizado = normalizar(nomeLancamento);
  for (const categoria of categorias) {
    const palavras = categoria.palavras || [];
    if (palavras.some(p => bateComPalavra(nomeNormalizado, p.palavra))) {
      return categoria.id_categoria;
    }
  }
  return null;
}
