import { useState, useCallback, useEffect } from 'react';
import type { User, AuthResult } from '@/types';

const USERS_KEY = 'bizhb_users';
const TOKEN_KEY = 'bizhb_token';
const CODES_KEY = 'bizhb_codes';
const CHAR_POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function safeBtoa(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  ));
}

function safeAtob(str: string): string {
  return decodeURIComponent(
    atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
}

function hashPw(pw: string): string {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = ((h << 5) - h) + pw.charCodeAt(i);
    h |= 0;
  }
  return h.toString(16);
}

function loadJSON<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') || fallback; }
  catch { return fallback; }
}

interface UseAuthReturn {
  user: User | null;
  isLoggedIn: boolean;
  login: (u: string, p: string) => AuthResult;
  register: (u: string, p: string, code: string) => AuthResult;
  logout: () => void;
  generateCode: () => string | null;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);

  // ── Restore session ──
  useEffect(() => {
    const users = loadJSON<Record<string, User>>(USERS_KEY, {});
    // Ensure founder exists
    if (!users['郝仕麟']) {
      users['郝仕麟'] = {
        username: '郝仕麟',
        password: hashPw('956244978'),
        role: 'member',
        createdAt: new Date().toISOString(),
        favorites: [],
      };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    // Restore token
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const payload = JSON.parse(safeAtob(token));
        if (payload.exp > Date.now() && users[payload.username]) {
          setUser(users[payload.username]);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }, []);

  const login = useCallback((username: string, password: string): AuthResult => {
    if (!username || !password) return { ok: false, msg: '请填写用户名和密码' };
    const users = loadJSON<Record<string, User>>(USERS_KEY, {});
    const u = users[username];
    if (!u) return { ok: false, msg: '用户不存在' };
    if (u.password !== hashPw(password)) return { ok: false, msg: '密码错误' };
    setUser(u);
    localStorage.setItem(TOKEN_KEY, safeBtoa(JSON.stringify({
      username: u.username, role: u.role,
      exp: Date.now() + 30 * 86400000,
    })));
    return { ok: true, msg: '' };
  }, []);

  const register = useCallback((username: string, password: string, code: string): AuthResult => {
    if (!username || !password || !code) return { ok: false, msg: '请填写所有字段' };
    if (username.length < 2) return { ok: false, msg: '用户名至少2个字符' };
    if (password.length < 4) return { ok: false, msg: '密码至少4位' };
    const users = loadJSON<Record<string, User>>(USERS_KEY, {});
    if (users[username]) return { ok: false, msg: '用户名已存在' };
    const codes = loadJSON<Record<string, { createdBy: string; createdAt: number; expiresAt: number; used: boolean }>>(CODES_KEY, {});
    const info = codes[code];
    if (!info) return { ok: false, msg: '邀请码不存在' };
    if (info.used) return { ok: false, msg: '邀请码已被使用' };
    if (Date.now() > info.expiresAt) return { ok: false, msg: '邀请码已过期' };
    const u: User = {
      username, password: hashPw(password), role: 'member',
      createdAt: new Date().toISOString(), favorites: [],
      inviteCode: code, invitedBy: info.createdBy,
    };
    users[username] = u;
    codes[code].used = true;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(CODES_KEY, JSON.stringify(codes));
    setUser(u);
    localStorage.setItem(TOKEN_KEY, safeBtoa(JSON.stringify({
      username: u.username, role: u.role,
      exp: Date.now() + 30 * 86400000,
    })));
    return { ok: true, msg: '' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  const generateCode = useCallback((): string | null => {
    if (!user) return null;
    let code = '';
    for (let i = 0; i < 8; i++) code += CHAR_POOL[Math.floor(Math.random() * 32)];
    const codes = loadJSON<Record<string, { createdBy: string; createdAt: number; expiresAt: number; used: boolean }>>(CODES_KEY, {});
    codes[code] = { createdBy: user.username, createdAt: Date.now(), expiresAt: Date.now() + 1800000, used: false };
    localStorage.setItem(CODES_KEY, JSON.stringify(codes));
    return code;
  }, [user]);

  const isFavorite = useCallback((id: string): boolean => {
    return user?.favorites.includes(id) ?? false;
  }, [user]);

  const toggleFavorite = useCallback((id: string) => {
    setUser(prev => {
      if (!prev) return prev;
      const f = [...prev.favorites];
      const idx = f.indexOf(id);
      if (idx > -1) f.splice(idx, 1);
      else f.push(id);
      const next = { ...prev, favorites: f };
      const users = loadJSON<Record<string, User>>(USERS_KEY, {});
      if (users[prev.username]) {
        users[prev.username].favorites = f;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
      return next;
    });
  }, []);

  return {
    user,
    isLoggedIn: !!user,
    login,
    register,
    logout,
    generateCode,
    isFavorite,
    toggleFavorite,
  };
}
