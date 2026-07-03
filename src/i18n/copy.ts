import type { GameId, LanguageCode } from "@/types/avi-words";

export const languages: LanguageCode[] = ["es", "en"];

export const copy = {
  es: {
    appName: "Avi Words",
    arena: "Arena",
    subtitle: "Reta a alguien en directo o sube en el ranking jugando solo.",
    guest: "Invitado",
    login: "Entrar",
    loginHint: "Login preparado para guardar score y rankings. Account AV no esta conectado en V0.",
    nickname: "Nombre",
    save: "Guardar",
    language: "Idioma",
    transportLocal: "Demo local",
    transportConvex: "Convex realtime",
    back: "Arena",
    play: "Jugar",
    challenge: "Retar",
    comingSoon: "Proximamente",
    share: "Compartir",
    copyLink: "Copiar enlace",
    copied: "Enlace copiado",
    waiting: "Esperando rival",
    ready: "Listo",
    notReady: "Quitar listo",
    startsIn: "Empieza en",
    yourTurn: "Tu turno",
    rivalTurn: "Turno del rival",
    requiredLetter: "Letra requerida",
    wordPlaceholder: "Escribe palabra",
    send: "Enviar",
    winner: "Ganador",
    roomFull: "La sala no esta disponible.",
    sprintStart: "Empezar sprint",
    sprintAgain: "Jugar otra vez",
    sprintSubmit: "Responder",
    sprintPlaceholder: "Tu palabra",
    sprintLeaderboard: "Ranking Sprint",
    score: "Puntos",
    streak: "Racha",
    correct: "Correctas",
    noScores: "Aun no hay puntuaciones.",
    games: {
      chain: {
        title: "Cadena",
        mode: "1v1 en vivo",
        summary: "Cada palabra empieza por la ultima letra de la anterior. Gana quien llegue a 5."
      },
      sprint: {
        title: "Sprint Solo",
        mode: "Solitario",
        summary: "60 segundos de prompts rapidos. Guarda score por idioma."
      },
      challenger: {
        title: "Retador",
        mode: "1v1 por rondas",
        summary: "El retador cambia en cada ronda y elige la trampa verbal."
      },
      word_bomb: {
        title: "Palabra Bomba",
        mode: "1v1 o bot",
        summary: "Responde con una silaba obligatoria antes de que explote el tiempo."
      }
    } satisfies Record<GameId, { title: string; mode: string; summary: string }>
  },
  en: {
    appName: "Avi Words",
    arena: "Arena",
    subtitle: "Challenge someone live or climb the solo leaderboard.",
    guest: "Guest",
    login: "Sign in",
    loginHint: "Login is prepared for future scores and rankings. Account AV is not connected in V0.",
    nickname: "Name",
    save: "Save",
    language: "Language",
    transportLocal: "Local demo",
    transportConvex: "Convex realtime",
    back: "Arena",
    play: "Play",
    challenge: "Challenge",
    comingSoon: "Coming soon",
    share: "Share",
    copyLink: "Copy link",
    copied: "Link copied",
    waiting: "Waiting for rival",
    ready: "Ready",
    notReady: "Unready",
    startsIn: "Starts in",
    yourTurn: "Your turn",
    rivalTurn: "Rival turn",
    requiredLetter: "Required letter",
    wordPlaceholder: "Type word",
    send: "Send",
    winner: "Winner",
    roomFull: "Room is not available.",
    sprintStart: "Start sprint",
    sprintAgain: "Play again",
    sprintSubmit: "Submit",
    sprintPlaceholder: "Your word",
    sprintLeaderboard: "Sprint leaderboard",
    score: "Score",
    streak: "Streak",
    correct: "Correct",
    noScores: "No scores yet.",
    games: {
      chain: {
        title: "Chain",
        mode: "Live 1v1",
        summary: "Each word starts with the previous word's last letter. First to 5 wins."
      },
      sprint: {
        title: "Solo Sprint",
        mode: "Solo",
        summary: "60 seconds of quick prompts. Saves scores per language."
      },
      challenger: {
        title: "Challenger",
        mode: "Round-based 1v1",
        summary: "The challenger changes every round and picks the word trap."
      },
      word_bomb: {
        title: "Word Bomb",
        mode: "1v1 or bot",
        summary: "Answer with the required syllable before the timer explodes."
      }
    } satisfies Record<GameId, { title: string; mode: string; summary: string }>
  }
};

export function detectInitialLanguage(): LanguageCode {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("aviWordsLanguage");
    if (stored === "es" || stored === "en") return stored;
  }
  if (typeof navigator !== "undefined") {
    return navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
  }
  return "es";
}
