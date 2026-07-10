import { NextResponse } from "next/server";
// cola aqui dentro a mesma lógica que já está em scripts/fechar-mes.js,
// só que exportada como função GET

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // ... lógica de fecharMesesAtrasados() aqui dentro ...

  return NextResponse.json({ ok: true });
}