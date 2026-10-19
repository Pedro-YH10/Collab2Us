import path from "path";
import { createServer } from "./index";
import { runMigrations } from "./db";
import express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

// Diretório de arquivos estáticos compilados do React (SPA)
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

app.use(express.static(distPath));

// Fallback do React Router para rotas que não pertençam à API
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"));
});

// Inicializa as migrações pendentes no banco e ativa as rotas HTTP
runMigrations()
  .then(() => {
    app.listen(Number(port), "0.0.0.0", () => {
      console.log(`Server rodando na porta: ${port}`);
      console.log(`Frontend: http://localhost:${port}`);
      console.log(`API: http://localhost:${port}/api`);
    });
  })
  .catch((err) => {
    console.error("Falha ao iniciar o Collab2Us devido a erros no banco de dados:", err);
    process.exit(1);
  });

  // Trata o encerramento do processo limpando dependências ativas
  const handleShutdown = (signal: string) => {
  console.log(`Sinal ${signal} recebido. Parando o Collab2Us.`);
  process.exit(0);
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));