"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gerarTokenSessao, comparacaoSegura, SESSION_COOKIE_NAME } from "@/lib/session";

export async function login(formData) {
  const senha = formData.get("senha") || "";
  const next = formData.get("next") || "/";
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
  });

  redirect(next);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
