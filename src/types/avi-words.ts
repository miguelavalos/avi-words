export type LanguageCode = "es" | "en";

export type PlayerKind = "guest" | "account";

export type GameId = "chain" | "sprint" | "challenger" | "word_bomb";

export interface GuestIdentity {
  guestPlayerId: string;
  nickname: string;
  playerKind: PlayerKind;
}

export interface GuestSession {
  sessionId: string;
  guestPlayerId: string;
  expiresAt: number;
}

export type ChainStatus = "waiting" | "countdown" | "active" | "finished" | "abandoned" | "expired";

export interface ChainPlayer {
  playerId: string;
  guestPlayerId: string;
  nickname: string;
  playerKind: PlayerKind;
  score: number;
  joinedAt: number;
  lastSeenAt: number;
}

export interface ChainEvent {
  eventId: string;
  turnNumber: number;
  playerId: string;
  word: string;
  normalizedWord: string;
  valid: boolean;
  reason: string;
  awardedPlayerId?: string;
  requiredLetter: string;
  createdAt: number;
}

export interface ChainRoom {
  roomId: string;
  status: ChainStatus;
  language: LanguageCode;
  createdByPlayerId: string;
  players: ChainPlayer[];
  readyPlayerIds: string[];
  currentTurnPlayerId?: string;
  requiredLetter: string;
  usedWords: string[];
  events: ChainEvent[];
  turnNumber: number;
  turnStartedAt?: number;
  turnEndsAt?: number;
  countdownEndsAt?: number;
  winnerPlayerId?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  serverNow?: number;
}

export type SprintPromptKind = "starts_with" | "contains" | "avoids" | "min_length" | "combo";

export interface SprintPrompt {
  promptId: string;
  kind: SprintPromptKind;
  label: string;
  letter?: string;
  syllable?: string;
  forbiddenLetter?: string;
  minLength?: number;
  points: number;
}

export interface SprintAnswerResult {
  valid: boolean;
  reason: string;
  points: number;
}

export interface SprintScoreEntry {
  scoreId: string;
  gameId: "sprint";
  language: LanguageCode;
  playerId: string;
  guestPlayerId: string;
  nickname: string;
  playerKind: PlayerKind;
  score: number;
  correctCount: number;
  maxStreak: number;
  durationSeconds: number;
  createdAt: number;
}
