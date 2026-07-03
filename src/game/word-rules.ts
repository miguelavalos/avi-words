import type { ChainEvent, ChainPlayer, ChainRoom, LanguageCode, SprintAnswerResult, SprintPrompt } from "@/types/avi-words";

export const CHAIN_WIN_SCORE = 5;
export const CHAIN_TURN_MS = 12_000;
export const CHAIN_COUNTDOWN_MS = 3_000;
export const CHAIN_ROOM_EXPIRY_MS = 90 * 60 * 1000;
export const SPRINT_DURATION_SECONDS = 60;

const startLetters: Record<LanguageCode, string[]> = {
  es: ["m", "c", "p", "r", "s", "l", "t"],
  en: ["m", "c", "p", "r", "s", "l", "t"]
};

const sprintLetters: Record<LanguageCode, string[]> = {
  es: ["m", "c", "p", "r", "s", "l", "t", "b", "n", "d"],
  en: ["m", "c", "p", "r", "s", "l", "t", "b", "n", "d"]
};

const sprintSyllables: Record<LanguageCode, string[]> = {
  es: ["tra", "con", "pre", "mar", "sol", "bar"],
  en: ["st", "br", "ch", "light", "star", "play"]
};

const sprintLabels = {
  es: {
    starts_with: (letter: string) => `Empieza por ${letter.toUpperCase()}`,
    contains: (syllable: string) => `Contiene "${syllable}"`,
    avoids: (letter: string) => `No uses ${letter.toUpperCase()}`,
    min_length: (count: number) => `Minimo ${count} letras`,
    combo: (letter: string, forbidden: string) => `Empieza por ${letter.toUpperCase()} sin usar ${forbidden.toUpperCase()}`
  },
  en: {
    starts_with: (letter: string) => `Starts with ${letter.toUpperCase()}`,
    contains: (syllable: string) => `Contains "${syllable}"`,
    avoids: (letter: string) => `Do not use ${letter.toUpperCase()}`,
    min_length: (count: number) => `At least ${count} letters`,
    combo: (letter: string, forbidden: string) => `Starts with ${letter.toUpperCase()} without ${forbidden.toUpperCase()}`
  }
};

export function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededPick<T>(items: T[], seed: number, fallback: T): T {
  if (items.length === 0) return fallback;
  return items[seed % items.length] ?? fallback;
}

export function normalizeWord(input: string): string {
  return input
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

export function displayWord(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 32);
}

export function firstLetter(word: string): string {
  return normalizeWord(word).slice(0, 1);
}

export function lastLetter(word: string): string {
  const normalized = normalizeWord(word);
  return normalized.slice(-1);
}

export function makeChainPlayer(guestPlayerId: string, nickname: string, now: number): ChainPlayer {
  return {
    playerId: guestPlayerId,
    guestPlayerId,
    nickname: nickname.trim().slice(0, 22) || "Guest Avi",
    playerKind: "guest",
    score: 0,
    joinedAt: now,
    lastSeenAt: now
  };
}

export function createLocalChainRoom(guestPlayerId: string, nickname: string, language: LanguageCode, now: number, seed = now): ChainRoom {
  const requiredLetter = seededPick(startLetters[language], stableHash(`${language}:${seed}`), "m");
  return {
    roomId: randomId("aw-room"),
    status: "waiting",
    language,
    createdByPlayerId: guestPlayerId,
    players: [makeChainPlayer(guestPlayerId, nickname, now)],
    readyPlayerIds: [],
    requiredLetter,
    usedWords: [],
    events: [],
    turnNumber: 1,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + CHAIN_ROOM_EXPIRY_MS
  };
}

export function joinLocalChainRoom(room: ChainRoom, guestPlayerId: string, nickname: string, now: number): ChainRoom {
  if (room.players.some((player) => player.playerId === guestPlayerId)) {
    return {
      ...room,
      players: room.players.map((player) => (player.playerId === guestPlayerId ? { ...player, nickname, lastSeenAt: now } : player)),
      updatedAt: now
    };
  }
  if (room.players.length >= 2 || room.status !== "waiting") {
    return room;
  }
  return {
    ...room,
    players: [...room.players, makeChainPlayer(guestPlayerId, nickname, now)],
    updatedAt: now
  };
}

export function setChainReady(room: ChainRoom, playerId: string, ready: boolean, now: number): ChainRoom {
  const readySet = new Set(room.readyPlayerIds);
  if (ready) {
    readySet.add(playerId);
  } else {
    readySet.delete(playerId);
  }
  const readyPlayerIds = Array.from(readySet).filter((id) => room.players.some((player) => player.playerId === id));
  if (room.players.length === 2 && readyPlayerIds.length === 2 && room.status === "waiting") {
    return {
      ...room,
      status: "countdown",
      readyPlayerIds,
      countdownEndsAt: now + CHAIN_COUNTDOWN_MS,
      currentTurnPlayerId: room.createdByPlayerId,
      updatedAt: now
    };
  }
  return { ...room, readyPlayerIds, updatedAt: now };
}

export function validateChainWord(room: ChainRoom, word: string): { valid: boolean; reason: string; normalizedWord: string } {
  const normalizedWord = normalizeWord(word);
  if (normalizedWord.length < 2) {
    return { valid: false, reason: "too_short", normalizedWord };
  }
  if (normalizedWord[0] !== room.requiredLetter) {
    return { valid: false, reason: "wrong_letter", normalizedWord };
  }
  if (room.usedWords.includes(normalizedWord)) {
    return { valid: false, reason: "repeated", normalizedWord };
  }
  return { valid: true, reason: "valid", normalizedWord };
}

function opponentOf(room: ChainRoom, playerId: string): ChainPlayer | undefined {
  return room.players.find((player) => player.playerId !== playerId);
}

function awardPoint(room: ChainRoom, awardedPlayerId: string, now: number): ChainRoom {
  const players = room.players.map((player) => {
    if (player.playerId !== awardedPlayerId) return player;
    return { ...player, score: player.score + 1, lastSeenAt: now };
  });
  const winner = players.find((player) => player.score >= CHAIN_WIN_SCORE);
  if (winner) {
    return {
      ...room,
      status: "finished",
      players,
      winnerPlayerId: winner.playerId,
      turnEndsAt: undefined,
      updatedAt: now
    };
  }
  return { ...room, players, updatedAt: now };
}

export function advanceChainRoom(room: ChainRoom, now: number): ChainRoom {
  if (room.status === "countdown" && room.countdownEndsAt !== undefined && now >= room.countdownEndsAt) {
    return {
      ...room,
      status: "active",
      turnStartedAt: now,
      turnEndsAt: now + CHAIN_TURN_MS,
      updatedAt: now
    };
  }
  if (room.status === "active" && room.turnEndsAt !== undefined && now >= room.turnEndsAt && room.currentTurnPlayerId) {
    const opponent = opponentOf(room, room.currentTurnPlayerId);
    if (!opponent) return room;
    const event: ChainEvent = {
      eventId: randomId("aw-event"),
      turnNumber: room.turnNumber,
      playerId: room.currentTurnPlayerId,
      word: "",
      normalizedWord: "",
      valid: false,
      reason: "timeout",
      awardedPlayerId: opponent.playerId,
      requiredLetter: room.requiredLetter,
      createdAt: now
    };
    const withPoint = awardPoint({ ...room, events: [...room.events, event] }, opponent.playerId, now);
    if (withPoint.status === "finished") return withPoint;
    return {
      ...withPoint,
      currentTurnPlayerId: opponent.playerId,
      turnNumber: room.turnNumber + 1,
      turnStartedAt: now,
      turnEndsAt: now + CHAIN_TURN_MS,
      updatedAt: now
    };
  }
  return room;
}

export function submitChainWord(room: ChainRoom, playerId: string, rawWord: string, now: number): ChainRoom {
  const advanced = advanceChainRoom(room, now);
  if (advanced.status !== "active" || advanced.currentTurnPlayerId !== playerId) {
    return advanced;
  }
  const opponent = opponentOf(advanced, playerId);
  if (!opponent) return advanced;
  const validation = validateChainWord(advanced, rawWord);
  const word = displayWord(rawWord);
  const event: ChainEvent = {
    eventId: randomId("aw-event"),
    turnNumber: advanced.turnNumber,
    playerId,
    word,
    normalizedWord: validation.normalizedWord,
    valid: validation.valid,
    reason: validation.reason,
    awardedPlayerId: validation.valid ? playerId : opponent.playerId,
    requiredLetter: advanced.requiredLetter,
    createdAt: now
  };
  const nextRequiredLetter = validation.valid ? lastLetter(rawWord) : advanced.requiredLetter;
  const usedWords = validation.valid ? [...advanced.usedWords, validation.normalizedWord] : advanced.usedWords;
  const withPoint = awardPoint({ ...advanced, events: [...advanced.events, event], usedWords }, event.awardedPlayerId ?? playerId, now);
  if (withPoint.status === "finished") return withPoint;
  return {
    ...withPoint,
    currentTurnPlayerId: opponent.playerId,
    requiredLetter: nextRequiredLetter || advanced.requiredLetter,
    turnNumber: advanced.turnNumber + 1,
    turnStartedAt: now,
    turnEndsAt: now + CHAIN_TURN_MS,
    updatedAt: now
  };
}

export function makeSprintPrompt(language: LanguageCode, index: number, seed: number): SprintPrompt {
  const letters = sprintLetters[language];
  const syllables = sprintSyllables[language];
  const hash = stableHash(`${language}:${seed}:${index}`);
  const kindIndex = hash % 5;
  const letter = seededPick(letters, hash, "m");
  const secondLetter = seededPick(letters, Math.floor(hash / 7), "a");
  const syllable = seededPick(syllables, Math.floor(hash / 11), "tra");
  const minLength = 5 + (hash % 4);
  const labels = sprintLabels[language];
  if (kindIndex === 0) {
    return { promptId: `prompt-${seed}-${index}`, kind: "starts_with", label: labels.starts_with(letter), letter, points: 10 };
  }
  if (kindIndex === 1) {
    return { promptId: `prompt-${seed}-${index}`, kind: "contains", label: labels.contains(syllable), syllable, points: 12 };
  }
  if (kindIndex === 2) {
    return { promptId: `prompt-${seed}-${index}`, kind: "avoids", label: labels.avoids(letter), forbiddenLetter: letter, points: 9 };
  }
  if (kindIndex === 3) {
    return { promptId: `prompt-${seed}-${index}`, kind: "min_length", label: labels.min_length(minLength), minLength, points: 9 };
  }
  return {
    promptId: `prompt-${seed}-${index}`,
    kind: "combo",
    label: labels.combo(letter, secondLetter),
    letter,
    forbiddenLetter: secondLetter,
    points: 16
  };
}

export function validateSprintAnswer(prompt: SprintPrompt, rawWord: string, streak: number): SprintAnswerResult {
  const normalized = normalizeWord(rawWord);
  if (normalized.length < 2) {
    return { valid: false, reason: "too_short", points: 0 };
  }
  let valid = true;
  if (prompt.kind === "starts_with") valid = normalized.startsWith(prompt.letter ?? "");
  if (prompt.kind === "contains") valid = normalized.includes(prompt.syllable ?? "");
  if (prompt.kind === "avoids") valid = !normalized.includes(prompt.forbiddenLetter ?? "");
  if (prompt.kind === "min_length") valid = normalized.length >= (prompt.minLength ?? 0);
  if (prompt.kind === "combo") {
    valid = normalized.startsWith(prompt.letter ?? "") && !normalized.includes(prompt.forbiddenLetter ?? "");
  }
  if (!valid) {
    return { valid: false, reason: "rule_failed", points: 0 };
  }
  const streakBonus = Math.min(8, Math.floor(streak / 3) * 2);
  const lengthBonus = Math.min(6, Math.max(0, normalized.length - 5));
  return { valid: true, reason: "valid", points: prompt.points + streakBonus + lengthBonus };
}
