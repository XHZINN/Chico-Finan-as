const SESSION_COOKIE = "sessao";
const SESSION_PAYLOAD = "sessao-valida";

async function hmac(secret, mensagem) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const assinatura = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(mensagem));
  return Array.from(new Uint8Array(assinatura)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function gerarTokenSessao() {
  return hmac(process.env.AUTH_SECRET, SESSION_PAYLOAD);
}

export function comparacaoSegura(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sessaoValida(token) {
  if (!token) return false;
  const esperado = await gerarTokenSessao();
  return comparacaoSegura(token, esperado);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

// só aceita caminho relativo do próprio site — bloqueia URL absoluta/externa
// (ex: "https://evil.com") e protocol-relative ("//evil.com") no ?next=
export function caminhoSeguro(next) {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}
