import { useState } from 'react';
import { X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AuthResult } from '@/types';

interface AuthModalProps {
  onLogin: (u: string, p: string) => AuthResult;
  onRegister: (u: string, p: string, code: string) => AuthResult;
  onClose: () => void;
}

export function AuthModal({ onLogin, onRegister, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    setError('');
    const r = onLogin(username, password);
    if (r.ok) {
      onClose();
    } else {
      setError(r.msg);
    }
  };

  const handleRegister = () => {
    setError('');
    const r = onRegister(username, password, inviteCode);
    if (r.ok) {
      onClose();
    } else {
      setError(r.msg);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div
        onClick={e => e.stopPropagation()}
        className="relative glass-card rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
      >
        {/* Tabs */}
        <div className="flex border-b border-border/50">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-colors',
              mode === 'login'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            登录
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-colors',
              mode === 'register'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            注册
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-3">
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}

          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            placeholder="用户名"
            className="w-full h-11 px-4 rounded-xl bg-secondary/50 border border-border/50 text-sm outline-none transition-all duration-200 focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10"
            onKeyDown={e => handleKeyDown(e, mode === 'login' ? handleLogin : handleRegister)}
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="密码"
            className="w-full h-11 px-4 rounded-xl bg-secondary/50 border border-border/50 text-sm outline-none transition-all duration-200 focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10"
            onKeyDown={e => handleKeyDown(e, mode === 'login' ? handleLogin : handleRegister)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {mode === 'register' && (
            <input
              type="text"
              value={inviteCode}
              onChange={e => { setInviteCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="邀请码（向已注册会员索取）"
              className="w-full h-11 px-4 rounded-xl bg-secondary/50 border border-border/50 text-sm outline-none transition-all duration-200 focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/10 tracking-wider font-mono"
              onKeyDown={e => handleKeyDown(e, handleRegister)}
            />
          )}

          <Button
            onClick={mode === 'login' ? handleLogin : handleRegister}
            className="w-full h-11 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/30"
          >
            {mode === 'login' ? '登录' : '注册'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface InviteModalProps {
  code: string;
  onClose: () => void;
  onCopy: () => void;
}

export function InviteModal({ code, onClose, onCopy }: InviteModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className="relative glass-card rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="font-bold text-sm">邀请码</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center border border-border/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">你的邀请码（30分钟内有效）：</p>
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl px-4 py-5 text-center border border-cyan-500/20">
            <span className="text-2xl font-extrabold tracking-[0.2em] font-mono text-cyan-400">
              {code}
            </span>
          </div>
          <Button
            onClick={onCopy}
            className="w-full h-11 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white"
          >
            <Copy className="h-4 w-4 mr-2" />
            复制邀请码
          </Button>
        </div>
      </div>
    </div>
  );
}
