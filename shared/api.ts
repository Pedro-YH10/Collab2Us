/**
 * Shared entre o client e server
 */

export interface DemoResponse {
  message: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  provider?: "local" | "google";
}

export interface AuthCredentials {
  name?: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

export type BoardSource = "miro" | "trello";

export interface Board {
  id: string;
  name: string;
  source: BoardSource;
  url?: string;
}

export interface BoardsResponse {
  boards: Board[];
}

export type ListStrategy = "first" | "byName" | "byTag";

export interface ConvertRequest {
  miroBoardId: string;
  trelloBoardId: string;
  listStrategy?: ListStrategy;
  listName?: string;
  template?: "userStory" | "raw";
}

export interface ConvertResponse {
  status: "ok" | "error";
  createdCards: number;
  details: string[];
}
