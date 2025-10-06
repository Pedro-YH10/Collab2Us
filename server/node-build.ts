import path from "path";
import { createServer } from "./index";
import express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

//Serve built SPA files:
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

//Serve static files:
app.use(express.static(distPath));

//React Router do index.html para todas as rotas de non-API:
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"));
});

//Iniciando o Collab2Us:
app.listen(port, () => {
  console.log(`Server rodando na porta: ${port}`);
  console.log(`Frontend: http://localhost:${port}`);
  console.log(`API: http://localhost:${port}/api`);
});

//Parando o Collab2Us:
process.on("SIGTERM", () => {
  console.log("Parando o Collab2Us");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Parando o Collab2Us");
  process.exit(0);
});
