import { makeFunctionReference } from "convex/server";
import type { ChainRoom, LanguageCode, SprintScoreEntry } from "@/types/avi-words";

export const ensureGuestSession = makeFunctionReference<
  "mutation",
  { guestPlayerId: string; nickname: string; language: LanguageCode; sessionId?: string },
  { sessionId: string; guestPlayerId: string; expiresAt: number }
>("aviWords:ensureGuestSession");

export const createChainChallenge = makeFunctionReference<
  "mutation",
  { sessionId: string; guestPlayerId: string; nickname: string; language: LanguageCode },
  { roomId: string }
>("aviWords:createChainChallenge");

export const joinChainChallenge = makeFunctionReference<
  "mutation",
  { sessionId: string; guestPlayerId: string; nickname: string; roomId: string },
  ChainRoom | null
>("aviWords:joinChainChallenge");

export const setChainReady = makeFunctionReference<
  "mutation",
  { sessionId: string; guestPlayerId: string; roomId: string; ready: boolean },
  ChainRoom | null
>("aviWords:setChainReady");

export const submitChainWord = makeFunctionReference<
  "mutation",
  { sessionId: string; guestPlayerId: string; roomId: string; word: string },
  ChainRoom | null
>("aviWords:submitChainWord");

export const advanceChainRoom = makeFunctionReference<
  "mutation",
  { sessionId: string; guestPlayerId: string; roomId: string },
  ChainRoom | null
>("aviWords:advanceChainRoom");

export const getChainRoom = makeFunctionReference<
  "query",
  { sessionId: string; guestPlayerId: string; roomId: string },
  ChainRoom | null
>("aviWords:getChainRoom");

export const recordSprintScore = makeFunctionReference<
  "mutation",
  {
    sessionId: string;
    guestPlayerId: string;
    nickname: string;
    language: LanguageCode;
    score: number;
    correctCount: number;
    maxStreak: number;
    durationSeconds: number;
  },
  SprintScoreEntry
>("aviWords:recordSprintScore");

export const listSprintLeaderboard = makeFunctionReference<
  "query",
  { language: LanguageCode; limit?: number },
  SprintScoreEntry[]
>("aviWords:listSprintLeaderboard");
