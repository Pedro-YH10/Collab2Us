import { RequestHandler } from "express";
import { DemoResponse } from "@shared/api";

//Rota de testes:
export const handleDemo: RequestHandler = (req, res) => {
  const response: DemoResponse = {
    message: "Teste do Express server",
  };
  res.status(200).json(response);
};
