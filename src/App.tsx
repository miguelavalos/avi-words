import { FormEvent, useEffect, useMemo, useState } from "react";
import { copy, detectInitialLanguage, languages } from "@/i18n/copy";
import { useAviWords } from "@/hooks/use-avi-words";
import { useGuestIdentity } from "@/hooks/use-guest-identity";
import { CHAIN_TURN_MS, makeSprintPrompt, SPRINT_DURATION_SECONDS, validateSprintAnswer } from "@/game/word-rules";
import type { ChainRoom, GameId, LanguageCode, SprintPrompt, SprintScoreEntry } from "@/types/avi-words";

type View = "arena" | "chain" | "sprint";

const gameOrder: GameId[] = ["chain", "sprint", "challenger", "word_bomb"];

function activeRoomIdFromPath(): string | null {
  const match = window.location.pathname.match(/^\/r\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function setPath(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function roomLink(roomId: string): string {
  return `${window.location.origin}/r/${encodeURIComponent(roomId)}`;
}

function secondsLeft(target?: number): number {
  if (!target) return 0;
  return Math.max(0, Math.ceil((target - Date.now()) / 1000));
}

function currentPlayer(room: ChainRoom, guestPlayerId: string) {
  return room.players.find((player) => player.playerId === guestPlayerId);
}

function opponentPlayer(room: ChainRoom, guestPlayerId: string) {
  return room.players.find((player) => player.playerId !== guestPlayerId);
}

export function App() {
  const [language, setLanguage] = useState<LanguageCode>(detectInitialLanguage);
  const [view, setView] = useState<View>(() => (activeRoomIdFromPath() ? "chain" : "arena"));
  const [activeRoomId, setActiveRoomId] = useState<string | null>(activeRoomIdFromPath);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const identity = useGuestIdentity();
  const t = copy[language];
  const controller = useAviWords({
    guestPlayerId: identity.guestPlayerId,
    nickname: identity.nickname,
    language,
    activeRoomId
  });

  useEffect(() => {
    setNicknameDraft(identity.nickname);
  }, [identity.nickname]);

  useEffect(() => {
    const onPop = () => {
      const roomId = activeRoomIdFromPath();
      setActiveRoomId(roomId);
      setView(roomId ? "chain" : "arena");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    localStorage.setItem("aviWordsLanguage", language);
  }, [language]);

  useEffect(() => {
    if (activeRoomId && !controller.room) {
      void controller.joinChainChallenge(activeRoomId);
    }
  }, [activeRoomId, controller.room, controller.joinChainChallenge]);

  async function createChallenge() {
    const roomId = await controller.createChainChallenge();
    setActiveRoomId(roomId);
    setView("chain");
    setPath(`/r/${encodeURIComponent(roomId)}`);
  }

  function backToArena() {
    setView("arena");
    setActiveRoomId(null);
    setPath("/");
  }

  async function shareChallenge(roomId: string) {
    const url = roomLink(roomId);
    const title = `${t.appName}: ${t.games.chain.title}`;
    const text = language === "es" ? "Te reto a una partida en directo." : "I challenge you to a live word duel.";
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function saveNickname(event: FormEvent) {
    event.preventDefault();
    identity.setNickname(nicknameDraft);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={backToArena} type="button" aria-label={t.appName}>
          <span className="brand-mark">AV</span>
          <span>
            <strong>{t.appName}</strong>
            <small>{t.arena}</small>
          </span>
        </button>

        <div className="topbar-actions">
          <span className={`transport transport-${controller.transport}`}>
            {controller.transport === "convex" ? t.transportConvex : t.transportLocal}
          </span>
          <label className="language-select">
            <span>{t.language}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)}>
              {languages.map((item) => (
                <option value={item} key={item}>
                  {item.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <details className="identity-menu">
            <summary>{identity.nickname || t.guest}</summary>
            <div className="identity-popover">
              <form onSubmit={saveNickname}>
                <label>
                  {t.nickname}
                  <input value={nicknameDraft} onChange={(event) => setNicknameDraft(event.target.value)} maxLength={22} />
                </label>
                <button type="submit">{t.save}</button>
              </form>
              <button className="login-button" type="button" title={t.loginHint}>
                {t.login}
              </button>
              <p>{t.loginHint}</p>
            </div>
          </details>
        </div>
      </header>

      {controller.errorMessage ? <p className="error-banner">{controller.errorMessage}</p> : null}

      {view === "arena" ? (
        <Arena t={t} onCreateChallenge={createChallenge} onOpenSprint={() => setView("sprint")} leaderboardCount={controller.leaderboard.length} />
      ) : null}

      {view === "chain" ? (
        <ChainScreen
          t={t}
          language={language}
          room={controller.room}
          guestPlayerId={identity.guestPlayerId}
          activeRoomId={activeRoomId}
          copied={copied}
          onBack={backToArena}
          onJoin={() => activeRoomId && controller.joinChainChallenge(activeRoomId)}
          onReady={(ready) => controller.setChainReady(ready)}
          onSubmit={(word) => controller.submitChainWord(word)}
          onShare={(roomId) => shareChallenge(roomId)}
        />
      ) : null}

      {view === "sprint" ? (
        <SprintScreen
          t={t}
          language={language}
          leaderboard={controller.leaderboard}
          onBack={() => setView("arena")}
          onRecordScore={controller.recordSprintScore}
        />
      ) : null}
    </div>
  );
}

function Arena({
  t,
  onCreateChallenge,
  onOpenSprint,
  leaderboardCount
}: {
  t: (typeof copy)["es"];
  onCreateChallenge: () => void;
  onOpenSprint: () => void;
  leaderboardCount: number;
}) {
  return (
    <main className="arena-layout">
      <section className="hero-panel">
        <div>
          <h1>{t.appName}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="hero-score">
          <strong>{leaderboardCount}</strong>
          <span>{t.sprintLeaderboard}</span>
        </div>
      </section>

      <section className="game-grid" aria-label="Games">
        {gameOrder.map((gameId) => {
          const game = t.games[gameId];
          const playable = gameId === "chain" || gameId === "sprint";
          return (
            <article className={`game-card game-card-${gameId}`} key={gameId}>
              <div className="game-card-top">
                <span className="game-mode">{game.mode}</span>
                {!playable ? <span className="soon-label">{t.comingSoon}</span> : null}
              </div>
              <h2>{game.title}</h2>
              <p>{game.summary}</p>
              <div className="game-actions">
                {gameId === "chain" ? (
                  <button type="button" onClick={onCreateChallenge}>
                    {t.challenge}
                  </button>
                ) : null}
                {gameId === "sprint" ? (
                  <button type="button" onClick={onOpenSprint}>
                    {t.play}
                  </button>
                ) : null}
                {!playable ? <button type="button" disabled>{t.comingSoon}</button> : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function ChainScreen({
  t,
  room,
  guestPlayerId,
  activeRoomId,
  copied,
  onBack,
  onJoin,
  onReady,
  onSubmit,
  onShare
}: {
  t: (typeof copy)["es"];
  language: LanguageCode;
  room: ChainRoom | null;
  guestPlayerId: string;
  activeRoomId: string | null;
  copied: boolean;
  onBack: () => void;
  onJoin: () => void;
  onReady: (ready: boolean) => void;
  onSubmit: (word: string) => void;
  onShare: (roomId: string) => void;
}) {
  const [word, setWord] = useState("");
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  void tick;

  if (!activeRoomId) {
    return (
      <main className="game-screen">
        <button className="ghost-button" onClick={onBack} type="button">{t.back}</button>
        <p>{t.roomFull}</p>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="game-screen">
        <button className="ghost-button" onClick={onBack} type="button">{t.back}</button>
        <section className="match-panel">
          <h1>{t.games.chain.title}</h1>
          <p>{t.waiting}</p>
          <button type="button" onClick={onJoin}>{t.play}</button>
        </section>
      </main>
    );
  }

  const me = currentPlayer(room, guestPlayerId);
  const rival = opponentPlayer(room, guestPlayerId);
  const ready = room.readyPlayerIds.includes(guestPlayerId);
  const myTurn = room.currentTurnPlayerId === guestPlayerId;
  const winner = room.players.find((player) => player.playerId === room.winnerPlayerId);
  const canSubmit = room.status === "active" && myTurn;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!word.trim()) return;
    onSubmit(word);
    setWord("");
  }

  return (
    <main className="game-screen">
      <div className="screen-nav">
        <button className="ghost-button" onClick={onBack} type="button">{t.back}</button>
        <button className="ghost-button" type="button" onClick={() => onShare(room.roomId)}>{copied ? t.copied : t.share}</button>
      </div>

      <section className="match-panel">
        <div className="match-header">
          <div>
            <h1>{t.games.chain.title}</h1>
            <p>{roomLink(room.roomId)}</p>
          </div>
          <span className={`status-pill status-${room.status}`}>{room.status}</span>
        </div>

        <div className="score-row">
          <PlayerScore name={me?.nickname ?? t.guest} score={me?.score ?? 0} active={myTurn} />
          <span className="versus">VS</span>
          <PlayerScore name={rival?.nickname ?? t.waiting} score={rival?.score ?? 0} active={room.currentTurnPlayerId === rival?.playerId} />
        </div>

        {room.status === "waiting" ? (
          <div className="waiting-box">
            <p>{rival ? "2/2" : t.waiting}</p>
            <button type="button" onClick={() => onReady(!ready)} disabled={!me || !rival}>
              {ready ? t.notReady : t.ready}
            </button>
            <button type="button" onClick={() => onShare(room.roomId)}>{t.copyLink}</button>
          </div>
        ) : null}

        {room.status === "countdown" ? (
          <div className="timer-orb">
            <span>{t.startsIn}</span>
            <strong>{secondsLeft(room.countdownEndsAt)}</strong>
          </div>
        ) : null}

        {room.status === "active" ? (
          <>
            <div className="turn-strip">
              <span>{myTurn ? t.yourTurn : t.rivalTurn}</span>
              <strong>{t.requiredLetter}: {room.requiredLetter.toUpperCase()}</strong>
              <span>{Math.ceil(((room.turnEndsAt ?? Date.now()) - Date.now()) / 1000)}s</span>
            </div>
            <form className="word-form" onSubmit={submit}>
              <input value={word} onChange={(event) => setWord(event.target.value)} placeholder={t.wordPlaceholder} disabled={!canSubmit} autoFocus={canSubmit} />
              <button type="submit" disabled={!canSubmit}>{t.send}</button>
            </form>
          </>
        ) : null}

        {room.status === "finished" ? (
          <div className="winner-panel">
            <span>{t.winner}</span>
            <strong>{winner?.nickname ?? "-"}</strong>
          </div>
        ) : null}

        <ol className="event-list">
          {room.events.slice(-6).reverse().map((event) => (
            <li key={event.eventId} className={event.valid ? "valid-event" : "invalid-event"}>
              <span>{event.word || event.reason}</span>
              <small>{event.requiredLetter.toUpperCase()} - {event.reason}</small>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function PlayerScore({ name, score, active }: { name: string; score: number; active: boolean }) {
  return (
    <div className={`player-score ${active ? "is-active" : ""}`}>
      <span>{name}</span>
      <strong>{score}</strong>
    </div>
  );
}

function SprintScreen({
  t,
  language,
  leaderboard,
  onBack,
  onRecordScore
}: {
  t: (typeof copy)["es"];
  language: LanguageCode;
  leaderboard: SprintScoreEntry[];
  onBack: () => void;
  onRecordScore: (score: { language: LanguageCode; score: number; correctCount: number; maxStreak: number; durationSeconds: number }) => Promise<unknown>;
}) {
  const [active, setActive] = useState(false);
  const [finished, setFinished] = useState(false);
  const [seed, setSeed] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const prompt: SprintPrompt = useMemo(() => makeSprintPrompt(language, index, seed), [index, language, seed]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (active && endsAt && now >= endsAt) {
      setActive(false);
      setFinished(true);
      void onRecordScore({ language, score, correctCount, maxStreak, durationSeconds: SPRINT_DURATION_SECONDS });
    }
  }, [active, correctCount, endsAt, language, maxStreak, now, onRecordScore, score]);

  function start() {
    setSeed(Date.now());
    setIndex(0);
    setAnswer("");
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setMaxStreak(0);
    setFinished(false);
    setEndsAt(Date.now() + SPRINT_DURATION_SECONDS * 1000);
    setActive(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!active) return;
    const result = validateSprintAnswer(prompt, answer, streak);
    if (result.valid) {
      const nextStreak = streak + 1;
      setScore((current) => current + result.points);
      setCorrectCount((current) => current + 1);
      setStreak(nextStreak);
      setMaxStreak((current) => Math.max(current, nextStreak));
    } else {
      setStreak(0);
    }
    setAnswer("");
    setIndex((current) => current + 1);
  }

  return (
    <main className="sprint-layout">
      <div className="screen-nav">
        <button className="ghost-button" onClick={onBack} type="button">{t.back}</button>
      </div>
      <section className="sprint-panel">
        <div>
          <h1>{t.games.sprint.title}</h1>
          <p>{t.games.sprint.summary}</p>
        </div>
        <div className="sprint-stats">
          <span>{t.score}: <strong>{score}</strong></span>
          <span>{t.streak}: <strong>{streak}</strong></span>
          <span>{Math.max(0, Math.ceil((endsAt - now) / 1000))}s</span>
        </div>
        {!active ? (
          <button className="primary-wide" type="button" onClick={start}>{finished ? t.sprintAgain : t.sprintStart}</button>
        ) : (
          <form className="sprint-form" onSubmit={submit}>
            <label>{prompt.label}</label>
            <div>
              <input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={t.sprintPlaceholder} autoFocus />
              <button type="submit">{t.sprintSubmit}</button>
            </div>
          </form>
        )}
      </section>

      <aside className="leaderboard-panel">
        <h2>{t.sprintLeaderboard}</h2>
        {leaderboard.length === 0 ? <p>{t.noScores}</p> : null}
        <ol>
          {leaderboard.map((entry) => (
            <li key={entry.scoreId}>
              <span>{entry.nickname}</span>
              <strong>{entry.score}</strong>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}
