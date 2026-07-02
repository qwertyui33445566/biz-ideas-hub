export interface BusinessEntry {
  type: 'business';
  date: string;
  title: string;
  description: string;
  tags: string[];
  potential: number;
  marketSize: string;
  competition: string;
  investment: string;
  actionItems: string[];
}

export interface GithubEntry {
  type: 'github';
  name: string;
  author: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  url: string;
  avatar: string;
  date: string;
  stars_synced?: boolean;
  synced_at?: string | null;
}

export type Entry = BusinessEntry | GithubEntry;

export interface DataFile {
  lastUpdate: string | null;
  dates: string[];
  entries: Entry[];
}

export interface User {
  username: string;
  password: string;
  role: string;
  createdAt: string;
  favorites: string[];
  inviteCode?: string;
  invitedBy?: string;
}

export interface UsersData {
  [username: string]: User;
}

export interface InviteCode {
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedBy?: string;
}

export interface InviteCodesData {
  [code: string]: InviteCode;
}

export interface AuthToken {
  username: string;
  role: string;
  exp: number;
}

export interface AuthResult {
  ok: boolean;
  msg: string;
}

export type SortMode = 'newest' | 'hottest' | 'stars';
export type TabMode = 'all' | 'business' | 'github' | 'favorites';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface StatsData {
  total: number;
  biz: number;
  gh: number;
  days: number;
}
