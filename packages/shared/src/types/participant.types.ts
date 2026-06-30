export const AVATAR_OPTIONS = [
  "fox",
  "owl",
  "panda",
  "koala",
  "tiger",
  "robot",
  "astronaut",
  "ninja",
  "wizard",
  "dragon",
  "octopus",
  "penguin",
] as const;

export type AvatarOption = (typeof AVATAR_OPTIONS)[number];

export interface Participant {
  id: string;
  eventId: string;
  username: string;
  email: string;
  avatar: AvatarOption;
  joinedAt: string;
  /** Set when the participant's socket disconnects; used to grey them out in the lobby/leaderboard. */
  isConnected: boolean;
  totalScore: number;
  /** Sum of response times (ms) for correct answers — used as the tie-break key. */
  cumulativeResponseTimeMs: number;
}
