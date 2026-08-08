import Toast from "../Toast";
import { login } from "./actions";

export default async function Login({ searchParams }) {
  const sp = await searchParams;
  const erro = sp.erro === "senha_invalida" ? "Senha incorreta." : null;
  const next = sp.next || "/";

  return (
    <div className="wrap">
      <h1>Chico Finanças</h1>
      <p className="sub">Entrar</p>
      {erro && <Toast mensagem={erro} />}

      <div className="receipt">
        <form action={login} className="add-form" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <input type="hidden" name="next" value={next} />
          <input className="name" name="senha" type="password" placeholder="Senha" autoFocus required />
          <button type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
}
