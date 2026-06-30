export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  username: string;
  avatar: string;
  score: number;
  cumulativeResponseTimeMs: number;
  scoreDelta?: number;
}

export interface Leaderboard {
  eventId: string;
  entries: LeaderboardEntry[];
  generatedAtMs: number;
}
