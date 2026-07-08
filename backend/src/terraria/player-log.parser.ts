export type PlayerLogEvent = 'join' | 'leave';

export interface PlayerLogMatch {
  event: PlayerLogEvent;
  playerName: string;
}

/** Terraria 专用服务器常见上下线日志：`华哥 has joined.` / `华哥 has left.` */
const JOIN_PATTERN = /^(.+?)\s+has joined\.?\s*$/i;
const LEAVE_PATTERN = /^(.+?)\s+has left\.?\s*$/i;

/** 保留对少数版本可能输出的聚合行解析 */
const PLAYERS_COUNT_PATTERN = /(\d+)\/(\d+)\s+players?/i;
const USERS_PLAYING_PATTERN = /(\d+)\s+users?\s+are\s+playing/i;

export function parsePlayerLogLine(line: string): PlayerLogMatch | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const joinMatch = trimmed.match(JOIN_PATTERN);
  if (joinMatch) {
    return { event: 'join', playerName: joinMatch[1].trim() };
  }

  const leaveMatch = trimmed.match(LEAVE_PATTERN);
  if (leaveMatch) {
    return { event: 'leave', playerName: leaveMatch[1].trim() };
  }

  return null;
}

export function parseAggregatePlayerCount(line: string): number | null {
  const trimmed = line.trim();
  const playersMatch = trimmed.match(PLAYERS_COUNT_PATTERN);
  if (playersMatch) {
    return parseInt(playersMatch[1], 10);
  }

  const connectedMatch = trimmed.match(USERS_PLAYING_PATTERN);
  if (connectedMatch) {
    return parseInt(connectedMatch[1], 10);
  }

  return null;
}

export class OnlinePlayerTracker {
  private readonly onlinePlayers = new Set<string>();

  reset(): void {
    this.onlinePlayers.clear();
  }

  apply(event: PlayerLogEvent, playerName: string): number {
    const name = playerName.trim();
    if (!name) return this.onlinePlayers.size;

    if (event === 'join') {
      this.onlinePlayers.add(name);
    } else {
      this.onlinePlayers.delete(name);
    }

    return this.onlinePlayers.size;
  }

  setCount(count: number): number {
    if (count <= 0) {
      this.onlinePlayers.clear();
      return 0;
    }

    // 聚合行无法还原玩家列表，仅同步计数（清空后占位）
    this.onlinePlayers.clear();
    for (let index = 0; index < count; index++) {
      this.onlinePlayers.add(`__aggregate_${index}`);
    }
    return this.onlinePlayers.size;
  }

  get count(): number {
    return this.onlinePlayers.size;
  }
}
