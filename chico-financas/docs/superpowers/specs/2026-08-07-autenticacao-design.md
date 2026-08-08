# Autenticação por senha única

Data: 2026-08-07

## Problema

O app hoje não tem nenhuma autenticação — qualquer pessoa com o link acessa
e edita todos os dados financeiros. É um app de uso pessoal (uma única
pessoa), então não precisa de contas de usuário, só de uma barreira simples
pra impedir acesso casual por quem não deveria ter o link.

## Objetivo

Uma tela de login com senha única. Sem contas, sem tabela nova no banco,
sem usar o Nhost Auth (que existe no projeto mas não está em uso e seria
over-engineering para um usuário só).

## Modelo

Duas variáveis de ambiente novas:

- `AUTH_PASSWORD`: a senha que dá acesso ao app.
- `AUTH_SECRET`: string aleatória usada só para assinar o cookie de sessão
  (não é a senha — mantém a senha simples de digitar/lembrar sem enfraquecer
  a resistência do cookie a forjamento).

Sessão **sem expiração** — o cookie continua válido até o usuário clicar em
"sair" (ou apagar o cookie manualmente). Trade-off aceito: menos proteção se
o dispositivo for perdido/roubado, mas máxima conveniência para uso pessoal
diário, que foi a preferência explícita.

## Cookie de sessão (sem estado no servidor)

Cookie `sessao` com valor = HMAC-SHA256(`AUTH_SECRET`, `"sessao-valida"`),
em hex. Não guarda nada em banco — validar a sessão é só recalcular o HMAC e
comparar. Usa a Web Crypto API (`crypto.subtle`), disponível tanto no
middleware (roda em Edge runtime) quanto nas server actions (Node.js
runtime moderno), evitando duas implementações do mesmo hash.

Atributos do cookie: `httpOnly` (não acessível via JS no browser),
`sameSite: "lax"`, `secure` (só em produção — permite `http://localhost` em
dev), `path: "/"`.

## Middleware (proteção das rotas)

`middleware.js` na raiz do projeto Next.js. Roda em toda requisição, exceto
o que o `matcher` exclui: `/login`, `/api/cron` (autenticado separadamente
via `CRON_SECRET`, sem cookie de browser), e assets estáticos
(`_next/*`, `favicon.ico`, arquivos em `/public`).

Se o cookie não existir ou não bater com o HMAC esperado, redireciona para
`/login?next=<rota original>`. Como as Server Actions do Next.js são POSTs
para a própria rota da página, o middleware já cobre elas automaticamente
— não precisa de proteção adicional em `actions.js`.

## Login / Logout

- `src/app/login/page.js`: formulário com um campo de senha, estilo
  "recibo" consistente com o resto do app (`.receipt`, `.add-form`). Mostra
  erro via o `<Toast/>` já existente se a senha estiver errada.
- Server action `login(formData)` (novo arquivo `src/app/login/actions.js`):
  lê a senha do form, compara com `AUTH_PASSWORD` usando comparação em
  tempo constante (`crypto.timingSafeEqual`, evita vazar informação por
  tempo de resposta), seta o cookie assinado e redireciona para o `next`
  (ou `/` se não houver), ou volta para `/login?erro=senha_invalida`.
- Server action `logout()`: apaga o cookie `sessao`, redireciona para
  `/login`. Fica atrás de um link "sair" no `NavBar`.

## Testes / verificação

Sem suíte automatizada. Verificação manual via `npm run dev`: acessar
qualquer rota sem cookie e confirmar redirecionamento para `/login`; logar
com senha errada e ver o erro; logar com senha certa e confirmar acesso
liberado a todas as telas; confirmar que `/api/cron` continua funcionando
sem cookie (só com `CRON_SECRET`); clicar "sair" e confirmar que volta a
pedir login.
