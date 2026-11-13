import { useCallback, useEffect, useRef } from "react";
import Shepherd from "shepherd.js";
import type Tour from "shepherd.js/src/types/tour";
import "shepherd.js/dist/css/shepherd.css";

const defaultTourOptions: Tour.TourOptions = {
  useModalOverlay: true,
  defaultStepOptions: {
    cancelIcon: { enabled: true },
    scrollTo: { behavior: "smooth", block: "center" },
    modalOverlayOpeningPadding: 6,
    modalOverlayOpeningRadius: 8,
    classes: "shadow-2xl rounded-xl",
  },
};

// 1. TOUR DA HOME
export function useHomeTour() {
  const tourRef = useRef<Tour | null>(null);

  const startTour = useCallback(() => {
    tourRef.current?.cancel();
    
    const tour = new Shepherd.Tour({
      useModalOverlay: false,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: false,
        classes: "shadow-xl border border-primary/20 rounded-xl bg-card text-card-foreground",
      },
    });

    tour.addSteps([
      {
        id: "status-cards",
        title: "👋 Bem-vindo ao Collab2Us",
        text: "Aqui você acompanha em tempo real o status das integrações do Miro e do Trello.",
        attachTo: { element: '[data-tour="home-integrations"]', on: "bottom" },
        buttons: [{ text: "Próximo", action: tour.next }],
      },
      {
        id: "sync-hub",
        title: "Fluxo Ágil",
        text: "Use estes atalhos para selecionar seus quadros ou ir direto para a extração e curadoria de histórias.",
        attachTo: { element: '[data-tour="home-sync-hub"]', on: "top" },
        buttons: [
          { text: "Entendi", action: tour.complete },
        ],
      },
    ]);

    const markDone = () => localStorage.setItem("c2u_tour_home", "true");
    tour.on("complete", markDone);
    tour.on("cancel", markDone);

    tourRef.current = tour;
    tour.start();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("c2u_tour_home")) {
      // Pequeno atraso de 800ms para a tela carregar suavemente primeiro
      const t = setTimeout(() => startTour(), 800);
      return () => {
        clearTimeout(t);
        tourRef.current?.cancel();
      };
    }
  }, [startTour]);

  return { startTour };
}

// 2. TOUR DE CONFIGURAÇÕES (SETTINGS)
export function useSettingsTour() {
  const tourRef = useRef<Tour | null>(null);

  const startTour = useCallback(() => {
    tourRef.current?.cancel();
    const tour = new Shepherd.Tour(defaultTourOptions);

    tour.addSteps([
      {
        id: "connect-unified",
        title: "1. Conexão Rápida (Recomendado)",
        text: "Autorize o Miro e o Trello em uma única sequência de autorizações OAuth.",
        attachTo: { element: '[data-tour="connect-both"]', on: "bottom" },
        buttons: [{ text: "Próximo", action: tour.next }],
      },
      {
        id: "individual-cards",
        title: "2. Conexões e Tokens Individuais",
        text: "Ou conecte cada plataforma separadamente e acompanhe os indicadores de conexão ativa.",
        attachTo: { element: '[data-tour="individual-tokens"]', on: "top" },
        buttons: [
          { text: "Voltar", action: tour.back },
          { text: "Concluir", action: tour.complete },
        ],
      },
    ]);

    tour.on("complete", () => localStorage.setItem("c2u_tour_settings", "true"));
    tour.on("cancel", () => localStorage.setItem("c2u_tour_settings", "true"));

    tourRef.current = tour;
    tour.start();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("c2u_tour_settings")) {
      const t = setTimeout(() => startTour(), 600);
      return () => clearTimeout(t);
    }
  }, [startTour]);

  return { startTour };
}

// 3. TOUR DE QUADROS (BOARDS)
export function useBoardsTour() {
  const tourRef = useRef<Tour | null>(null);

  const startTour = useCallback(() => {
    tourRef.current?.cancel();
    const tour = new Shepherd.Tour(defaultTourOptions);

    tour.addSteps([
      {
        id: "miro-column",
        title: "1. Quadros de Ideação (Miro)",
        text: "Seus quadros do Miro aparecem aqui. Você pode criar novos quadros já com modelos estruturados (como o User Story Canvas).",
        attachTo: { element: '[data-tour="boards-miro"]', on: "right" },
        buttons: [{ text: "Próximo", action: tour.next }],
      },
      {
        id: "trello-column",
        title: "2. Quadros de Backlog (Trello)",
        text: "Seus quadros do Trello aparecem aqui. Crie novos quadros com listas de desenvolvimento ou abra diretamente o backlog.",
        attachTo: { element: '[data-tour="boards-trello"]', on: "left" },
        buttons: [
          { text: "Voltar", action: tour.back },
          { text: "Concluir", action: tour.complete },
        ],
      },
    ]);

    tour.on("complete", () => localStorage.setItem("c2u_tour_boards", "true"));
    tour.on("cancel", () => localStorage.setItem("c2u_tour_boards", "true"));

    tourRef.current = tour;
    tour.start();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("c2u_tour_boards")) {
      const t = setTimeout(() => startTour(), 600);
      return () => clearTimeout(t);
    }
  }, [startTour]);

  return { startTour };
}

// 4. TOUR DE HISTÓRIAS (STORIES)
export function useStoriesTour() {
  const tourRef = useRef<Tour | null>(null);

  const startTour = useCallback(() => {
    tourRef.current?.cancel();
    const tour = new Shepherd.Tour(defaultTourOptions);

    tour.addSteps([
      {
        id: "scope",
        title: "1. Mapeamento de Escopo",
        text: "Selecione o quadro do Miro (origem), o quadro e a coluna do Trello (destino) e o modo de leitura dos post-its.",
        attachTo: { element: '[data-tour="scope-panel"]', on: "bottom" },
        buttons: [{ text: "Próximo", action: tour.next }],
      },
      {
        id: "extract-btn",
        title: "2. Extrair Notas",
        text: "Clique aqui para ler os post-its e conectores do Miro e carregá-los no editor.",
        attachTo: { element: '[data-tour="map-btn"]', on: "bottom" },
        buttons: [
          { text: "Voltar", action: tour.back },
          { text: "Próximo", action: tour.next },
        ],
      },
      {
        id: "curation",
        title: "3. Curadoria e Qualidade (QUS / INVEST)",
        text: "Aqui você revisa o texto, confere os selos INVEST e a nota de qualidade QUS. O refinamento ou divisão com IA é totalmente opcional e requer que você cadastre sua própria chave de API na tela de Workflow.",
        attachTo: { element: '[data-tour="curation-panel"]', on: "top" },
        buttons: [
          { text: "Voltar", action: tour.back },
          { text: "Próximo", action: tour.next },
        ],
      },
      {
        id: "export-btn",
        title: "4. Exportar para o Trello",
        text: "Com as histórias revisadas e ativadas no switch, envie os requisitos diretamente para o backlog no Trello.",
        attachTo: { element: '[data-tour="export-btn"]', on: "top" },
        buttons: [
          { text: "Voltar", action: tour.back },
          { text: "Próximo", action: tour.next },
        ],
      },
      {
        id: "sync",
        title: "5. Rastreabilidade Bidirecional",
        text: "Se a equipe alterar o card no Trello, use este botão para detectar divergências e sincronizar de volta no Miro.",
        attachTo: { element: '[data-tour="sync-btn"]', on: "bottom" },
        buttons: [
          { text: "Voltar", action: tour.back },
          { text: "Concluir", action: tour.complete },
        ],
      },
    ]);

    tour.on("complete", () => localStorage.setItem("c2u_tour_stories", "true"));
    tour.on("cancel", () => localStorage.setItem("c2u_tour_stories", "true"));

    tourRef.current = tour;
    tour.start();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("c2u_tour_stories")) {
      const t = setTimeout(() => startTour(), 600);
      return () => clearTimeout(t);
    }
  }, [startTour]);

  return { startTour };
}

// 5. TOUR DO WORKFLOW
export function useWorkflowTour() {
  const tourRef = useRef<Tour | null>(null);

  const startTour = useCallback(() => {
    // Garante que o elemento já está presente no DOM antes de iniciar
    const targetElement = document.querySelector('[data-tour="workflow-ai-card"]');
    if (!targetElement) return;

    tourRef.current?.cancel();
    const tour = new Shepherd.Tour(defaultTourOptions);

    tour.addSteps([
      {
        id: "ai-settings",
        title: "Chave de IA (Totalmente Opcional)",
        text: "O Collab2Us funciona integralmente sem IA. Caso deseje utilizar o refinamento automático ou divisão de histórias, selecione o provedor e insira sua chave de API própria aqui.",
        attachTo: { element: '[data-tour="workflow-ai-card"]', on: "bottom" },
        buttons: [{ text: "Próximo", action: tour.next }],
      },
      {
        id: "quality-gate",
        title: "Regras de Qualidade (QUS)",
        text: "Ajuste aqui a nota de corte para alertas de qualidade e selecione o template padrão de escrita das histórias.",
        attachTo: { element: '[data-tour="workflow-quality-card"]', on: "top" },
        buttons: [
          { text: "Voltar", action: tour.back },
          { text: "Concluir", action: tour.complete },
        ],
      },
    ]);

    const markDone = () => localStorage.setItem("c2u_tour_workflow", "true");
    tour.on("complete", markDone);
    tour.on("cancel", markDone);

    tourRef.current = tour;
    tour.start();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("c2u_tour_workflow")) {
      // Timeout de 1000ms garante que o fetch inicial do banco no Workflow já terminou
      const t = setTimeout(() => startTour(), 1000);
      return () => {
        clearTimeout(t);
        tourRef.current?.cancel();
      };
    }
  }, [startTour]);

  return { startTour };
}