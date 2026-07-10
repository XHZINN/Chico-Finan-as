const { execSync } = require("child_process");

setInterval(() => {
  console.log("Verificando fechamento de mês...", new Date().toISOString());
  try {
    execSync("node scripts/fechar-mes.js", { stdio: "inherit" });
  } catch (e) {
    console.error("Erro ao fechar mês:", e);
  }
}, 24 * 60 * 60 * 1000); // 24 horas

console.log("Agendador iniciado.");