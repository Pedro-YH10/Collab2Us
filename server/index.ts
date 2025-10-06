import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { handleDemo } from "./routes/demo";
import { register, login, logout } from "./routes/auth";
import { googleStart, googleCallback, miroStart, miroCallback, trelloStart, trelloCallbackPage, trelloSaveToken, saveManualToken } from "./routes/oauth";
import { getMiroBoards, searchMiroBoards, updateMiroBoard, deleteMiroBoard, debugMiroItems } from "./routes/miro";
import { getTrelloBoards, searchTrelloBoards, updateTrelloBoard, deleteTrelloBoard } from "./routes/trello";
import { convertMiroToTrello } from "./routes/convert";
import { convertTrelloToMiro } from "./routes/convert-reverse";
import { getMiroNotes } from "./routes/miro-notes";
import { getTrelloLists } from "./routes/trello-lists";
import { analyzeStory, previewMiroStories } from "./routes/stories";
import { getTokenInfo } from "./routes/integrations";
import { getUser, updateUserName, deleteUserAccount } from "./routes/users";

export function createServer() {
  const app = express();

  //Rotas de Middleware:
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  //Rotas de API:
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  //Rotas de Auth(manual) e OAuth:
  app.post("/api/auth/register", register);
  app.post("/api/auth/login", login);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/google/start", googleStart);
  app.get("/auth/redirect/google", googleCallback);

  app.get("/api/auth/miro/start", miroStart);
  app.get("/auth/redirect/miro", miroCallback);

  app.get("/api/auth/trello/start", trelloStart);
  app.get("/auth/redirect/trello", trelloCallbackPage);
  app.post("/api/auth/trello/save-token", trelloSaveToken);

  //Rotas de Tokens Manual:
  app.post("/api/integrations/token", saveManualToken);

  //Rotas do User:
  app.get("/api/users/:id", getUser);
  app.put("/api/users/:id", updateUserName);
  app.delete("/api/users/:id", deleteUserAccount);

  //Rotas das Integrações:
  app.get("/api/miro/boards", getMiroBoards);
  app.get("/api/miro/boards/search", searchMiroBoards);
  app.put("/api/miro/boards/:id", updateMiroBoard);
  app.delete("/api/miro/boards/:id", deleteMiroBoard);

  app.get("/api/trello/boards", getTrelloBoards);
  app.get("/api/trello/boards/search", searchTrelloBoards);
  app.put("/api/trello/boards/:id", updateTrelloBoard);
  app.delete("/api/trello/boards/:id", deleteTrelloBoard);

  app.get("/api/miro/notes", getMiroNotes);
  app.get("/api/trello/lists", getTrelloLists);

  //Rotas dos converter:
  app.post("/api/convert/miro-to-trello", convertMiroToTrello);
  app.post("/api/convert/trello-to-miro", convertTrelloToMiro);
  app.post("/api/stories/analyze", analyzeStory);
  app.post("/api/stories/preview", previewMiroStories);
  app.get("/api/integrations/token", getTokenInfo);



  //Rotas de Debug:
  //app.get("/api/miro/debug/items", debugMiroItems);

  return app;
}
