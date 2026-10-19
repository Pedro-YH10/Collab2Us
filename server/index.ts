import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { requireAuth } from "./middleware/auth";
import { register, login, logout } from "./routes/auth";
import { googleStart, googleCallback, miroStart, miroCallback, trelloStart, trelloCallbackPage, trelloSaveToken, saveManualToken } from "./routes/oauth";
import { getMiroBoards, searchMiroBoards, updateMiroBoard, deleteMiroBoard, debugMiroItems, instantiateTemplate, createMiroBoard } from "./routes/miro";
import { getTrelloBoards, searchTrelloBoards, updateTrelloBoard, deleteTrelloBoard, getTrelloBoardMembers, getTrelloBoardCards, updateTrelloCard, archiveTrelloCard, createTrelloBoard} from "./routes/trello";
import { previewMiroStories, commitCuratedStories, checkSyncStatus, executeSyncPull } from "./routes/convert";
import { convertTrelloToMiro } from "./routes/convert-reverse";
import { getMiroNotes } from "./routes/miro-notes";
import { getTrelloLists } from "./routes/trello-lists";
import { getSyncMetrics, saveAcademicEvaluation } from "./routes/metrics";
import { getUser, updateUserName, deleteUserAccount, getCurrentUser } from "./routes/users";
import { getTokenInfo } from "./routes/integrations";
import { analyzeStory } from "./routes/stories"; 
import { getWorkflowSettings, saveWorkflowSettings } from "./routes/workflow";
import { handleAIGetModels, handleAIRefineStory, handleAIGenerateIdeas, handleAISplitStory } from "./routes/ai";

export function createServer() {
  const app = express();
  app.set("trust proxy", true);

  const allowedOrigin = process.env.NODE_ENV === "production"
    ? (process.env.CLIENT_URL || process.env.SERVER_URL || "")
    : true;

  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get("/api/ping", (_req, res) => res.json({ message: "pong" }));

  app.post("/api/auth/register", register);
  app.post("/api/auth/login", login);
  app.post("/api/auth/logout", logout);

  app.get("/api/users/current", requireAuth, getCurrentUser);
  app.get("/api/users/:id", requireAuth, getUser);
  app.put("/api/users/:id", requireAuth, updateUserName);
  app.delete("/api/users/:id", requireAuth, deleteUserAccount);

  app.get("/api/auth/google/start", googleStart);
  app.get("/auth/redirect/google", googleCallback);
  app.get("/api/auth/miro/start", requireAuth, miroStart);
  app.get("/auth/redirect/miro", miroCallback);
  app.get("/api/auth/trello/start", requireAuth, trelloStart);
  app.get("/auth/redirect/trello", trelloCallbackPage);
  app.post("/api/auth/trello/save-token", requireAuth, trelloSaveToken);

  app.get("/api/integrations/token", requireAuth, getTokenInfo);
  app.post("/api/integrations/token", requireAuth, saveManualToken);
  
  app.use("/api/miro", requireAuth);
  app.use("/api/trello", requireAuth);
  app.use("/api/convert", requireAuth);
  app.use("/api/ai", requireAuth);

  app.get("/api/miro/boards", getMiroBoards);
  app.post("/api/miro/boards", createMiroBoard);
  app.get("/api/miro/boards/search", searchMiroBoards);
  app.put("/api/miro/boards/:id", updateMiroBoard);
  app.delete("/api/miro/boards/:id", deleteMiroBoard);
  app.get("/api/miro/notes", getMiroNotes);
  app.post("/api/miro/boards/:id/template", instantiateTemplate);

  app.get("/api/trello/boards", getTrelloBoards);
  app.post("/api/trello/boards", createTrelloBoard);
  app.get("/api/trello/boards/search", searchTrelloBoards);
  app.put("/api/trello/boards/:id", updateTrelloBoard);
  app.delete("/api/trello/boards/:id", deleteTrelloBoard);
  app.get("/api/trello/lists", getTrelloLists);
  app.get("/api/trello/boards/:id/members", getTrelloBoardMembers);
  app.get("/api/trello/boards/:id/cards", getTrelloBoardCards);
  app.put("/api/trello/cards/:cardId", requireAuth, updateTrelloCard);
  app.post("/api/trello/cards/:cardId/archive", requireAuth, archiveTrelloCard);
  
  app.get("/api/convert/preview", previewMiroStories);
  app.post("/api/convert/commit", commitCuratedStories);
  app.get("/api/convert/sync-check", checkSyncStatus);
  app.post("/api/convert/sync-pull", executeSyncPull);
  app.get("/api/convert/metrics", getSyncMetrics);
  app.post("/api/convert/analyze", analyzeStory);

  app.get("/api/ai/models", handleAIGetModels);
  app.post("/api/ai/refine", handleAIRefineStory);
  app.post("/api/ai/generate-ideas", handleAIGenerateIdeas);
  app.post("/api/ai/split", handleAISplitStory);

  app.get("/api/workflow/settings", requireAuth, getWorkflowSettings);
  app.post("/api/workflow/settings", requireAuth, saveWorkflowSettings);
  
  app.post("/api/convert/trello-to-miro", convertTrelloToMiro);

  return app;
}