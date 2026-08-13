"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gerarTokenSessao, comparacaoSegura, caminhoSeguro, SESSION_COOKIE_NAME } from "@/lib/session";

export async function login(formData) {
  const senha = formData.get("senha") || "";
  const next = caminhoSeguro(formData.get("next"));
  const senhaEsperada = process.env.AUTH_PASSWORD;

  if (!senhaEsperada || !senha || !comparacaoSegura(senha, senhaEsperada)) {
    redirect(`/login?erro=senha_invalida&next=${encodeURIComponent(next)}`);
  }

  const token = await gerarTokenSessao();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // sem maxAge, o navegador trata como cookie de sessão (some ao fechar).
    // 10 anos cobre "sem expiração, só sai clicando em sair".
    maxAge: 60 * 60 * 24 * 365 * 10,
  });

  redirect(next);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
