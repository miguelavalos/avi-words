import { ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as convexApi from "@/convex/avi-words-functions";
import {
  advanceChainRoom as advanceLocalChainRoom,
  createLocalChainRoom,
  joinLocalChainRoom,
  setChainReady as setLocalChainReady,
  submitChainWord as submitLocalChainWord
} from "@/game/word-rules";
import type { ChainRoom, LanguageCode, SprintScoreEntry } from "@/types/avi-words";

type Transport = "convex" | "local";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const localRoomsKey = "aviWordsLocalRooms";
const localScoresKey = "aviWordsLocalSprintScores";

function readLocalRooms(): Record<string, ChainRoom> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(localRoomsKey) ?? "{}") as Record<string, ChainRoom>;
  } catch {
    return {};
  }
}

function writeLocalRoom(room: ChainRoom): void {
  if (typeof localStorage === "undefined") return;
  const rooms = readLocalRooms();
  rooms[room.roomId] = room;
  localStorage.setItem(localRoomsKey, JSON.stringify(rooms));
}

function readLocalScores(): SprintScoreEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(localScoresKey) ?? "[]") as SprintScoreEntry[];
  } catch {
    return [];
  }
}

function writeLocalScores(scores: SprintScoreEntry[]): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(localScoresKey, JSON.stringify(scores.slice(0, 100)));
  }
}

interface UseAviWordsOptions {
  guestPlayerId: string;
  nickname: string;
  language: LanguageCode;
  activeRoomId: string | null;
}

export function useAviWords(options: UseAviWordsOptions) {
  const transport: Transport = convexUrl ? "convex" : "local";
  const convexClient = useMemo(() => (convexUrl ? new ConvexReactClient(convexUrl) : null), []);
  const [sessionId, setSessionId] = useState<string | null>(transport === "local" ? "local-session" : null);
  const [room, setRoom] = useState<ChainRoom | null>(null);
  const [leaderboard, setLeaderboard] = useState<SprintScoreEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const roomRef = useRef<ChainRoom | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    return () => {
      void convexClient?.close();
    };
  }, [convexClient]);

  useEffect(() => {
    if (!convexClient) return;
    let cancelled = false;
    convexClient
      .mutation(convexApi.ensureGuestSession, {
        sessionId: sessionId ?? undefined,
        guestPlayerId: options.guestPlayerId,
        nickname: options.nickname,
        language: options.language
      })
      .then((session) => {
        if (!cancelled) setSessionId(session.sessionId);
      })
      .catch((error: unknown) => {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [convexClient, options.guestPlayerId, options.language, options.nickname, sessionId]);

  useEffect(() => {
    if (!options.activeRoomId) {
      setRoom(null);
      return;
    }
    if (transport === "local") {
      setRoom(readLocalRooms()[options.activeRoomId] ?? null);
    }
  }, [options.activeRoomId, transport]);

  useEffect(() => {
    if (!convexClient || !sessionId || !options.activeRoomId) return;
    const watch = convexClient.watchQuery(convexApi.getChainRoom, {
      sessionId,
      guestPlayerId: options.guestPlayerId,
      roomId: options.activeRoomId
    });
    const unsubscribe = watch.onUpdate(() => {
      setRoom(watch.localQueryResult() ?? null);
    });
    return () => unsubscribe();
  }, [convexClient, options.activeRoomId, options.guestPlayerId, sessionId]);

  const refreshLeaderboard = useCallback(async () => {
    if (convexClient) {
      const scores = await convexClient.query(convexApi.listSprintLeaderboard, { language: options.language, limit: 8 });
      setLeaderboard(scores);
      return;
    }
    setLeaderboard(
      readLocalScores()
        .filter((score) => score.language === options.language)
        .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
        .slice(0, 8)
    );
  }, [convexClient, options.language]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = roomRef.current;
      if (!current || current.status === "finished") return;
      if (convexClient && sessionId) {
        void convexClient
          .mutation(convexApi.advanceChainRoom, {
            sessionId,
            guestPlayerId: options.guestPlayerId,
            roomId: current.roomId
          })
          .catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : String(error)));
        return;
      }
      const advanced = advanceLocalChainRoom(current, Date.now());
      if (advanced !== current) {
        writeLocalRoom(advanced);
        setRoom(advanced);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [convexClient, options.guestPlayerId, sessionId]);

  const createChainChallenge = useCallback(async () => {
    setErrorMessage(null);
    const now = Date.now();
    if (convexClient && sessionId) {
      const result = await convexClient.mutation(convexApi.createChainChallenge, {
        sessionId,
        guestPlayerId: options.guestPlayerId,
        nickname: options.nickname,
        language: options.language
      });
      return result.roomId;
    }
    const localRoom = createLocalChainRoom(options.guestPlayerId, options.nickname, options.language, now);
    writeLocalRoom(localRoom);
    setRoom(localRoom);
    return localRoom.roomId;
  }, [convexClient, options.guestPlayerId, options.language, options.nickname, sessionId]);

  const joinChainChallenge = useCallback(async (roomId: string) => {
    setErrorMessage(null);
    if (convexClient && sessionId) {
      const joined = await convexClient.mutation(convexApi.joinChainChallenge, {
        sessionId,
        guestPlayerId: options.guestPlayerId,
        nickname: options.nickname,
        roomId
      });
      setRoom(joined);
      return joined;
    }
    const current = readLocalRooms()[roomId] ?? null;
    if (!current) {
      setRoom(null);
      return null;
    }
    const joined = joinLocalChainRoom(current, options.guestPlayerId, options.nickname, Date.now());
    writeLocalRoom(joined);
    setRoom(joined);
    return joined;
  }, [convexClient, options.guestPlayerId, options.nickname, sessionId]);

  const setChainReady = useCallback(async (ready: boolean) => {
    const current = roomRef.current;
    if (!current) return;
    if (convexClient && sessionId) {
      const updated = await convexClient.mutation(convexApi.setChainReady, {
        sessionId,
        guestPlayerId: options.guestPlayerId,
        roomId: current.roomId,
        ready
      });
      setRoom(updated);
      return;
    }
    const updated = setLocalChainReady(current, options.guestPlayerId, ready, Date.now());
    writeLocalRoom(updated);
    setRoom(updated);
  }, [convexClient, options.guestPlayerId, sessionId]);

  const submitChainWord = useCallback(async (word: string) => {
    const current = roomRef.current;
    if (!current) return;
    if (convexClient && sessionId) {
      const updated = await convexClient.mutation(convexApi.submitChainWord, {
        sessionId,
        guestPlayerId: options.guestPlayerId,
        roomId: current.roomId,
        word
      });
      setRoom(updated);
      return;
    }
    const updated = submitLocalChainWord(current, options.guestPlayerId, word, Date.now());
    writeLocalRoom(updated);
    setRoom(updated);
  }, [convexClient, options.guestPlayerId, sessionId]);

  const recordSprintScore = useCallback(async (score: Omit<SprintScoreEntry, "scoreId" | "gameId" | "playerId" | "guestPlayerId" | "nickname" | "playerKind" | "createdAt">) => {
    if (convexClient && sessionId) {
      const saved = await convexClient.mutation(convexApi.recordSprintScore, {
        sessionId,
        guestPlayerId: options.guestPlayerId,
        nickname: options.nickname,
        language: score.language,
        score: score.score,
        correctCount: score.correctCount,
        maxStreak: score.maxStreak,
        durationSeconds: score.durationSeconds
      });
      await refreshLeaderboard();
      return saved;
    }
    const saved: SprintScoreEntry = {
      scoreId: `local-score-${Date.now()}`,
      gameId: "sprint",
      playerId: options.guestPlayerId,
      guestPlayerId: options.guestPlayerId,
      nickname: options.nickname,
      playerKind: "guest",
      createdAt: Date.now(),
      ...score
    };
    const scores = [saved, ...readLocalScores()].sort((a, b) => b.score - a.score);
    writeLocalScores(scores);
    await refreshLeaderboard();
    return saved;
  }, [convexClient, options.guestPlayerId, options.nickname, refreshLeaderboard, sessionId]);

  return {
    transport,
    sessionId,
    room,
    leaderboard,
    errorMessage,
    createChainChallenge,
    joinChainChallenge,
    setChainReady,
    submitChainWord,
    recordSprintScore,
    refreshLeaderboard
  };
}
