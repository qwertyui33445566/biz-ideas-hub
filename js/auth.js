/**
 * 会员邀请制认证系统 v2.0
 * - 只有已登录会员可以生成邀请码
 * - 邀请码30分钟内有效
 * - 只能通过邀请码注册（无公开注册入口）
 */

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.inviteCodes = this.loadInviteCodes();
        this.users = this.loadUsers();
        this.init();
    }

    init() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            this.currentUser = this.validateToken(token);
        }
        // 自动创建创始会员（如果不存在）
        this.ensureFounderExists();
    }

    // 确保创始会员存在
    ensureFounderExists() {
        const founderUsername = '郝仕麟';
        const founderPassword = '956244978';
        if (!this.users[founderUsername]) {
            this.users[founderUsername] = {
                username: founderUsername,
                password: this.hashPassword(founderPassword),
                role: 'member',
                createdAt: new Date().toISOString(),
                favorites: []
            };
            this.saveUsers();
            console.log('创始会员已创建:', founderUsername);
        }
    }

    loadInviteCodes() {
        const codes = localStorage.getItem('biz_invite_codes');
        return codes ? JSON.parse(codes) : {};
    }

    saveInviteCodes() {
        localStorage.setItem('biz_invite_codes', JSON.stringify(this.inviteCodes));
    }

    loadUsers() {
        const users = localStorage.getItem('biz_users');
        return users ? JSON.parse(users) : {};
    }

    saveUsers() {
        localStorage.setItem('biz_users', JSON.stringify(this.users));
    }

    // 生成邀请码（仅限已登录会员）
    generateInviteCode() {
        if (!this.currentUser) {
            return { valid: false, message: '请先登录' };
        }

        const code = this.randomCode();
        const now = Date.now();
        
        this.inviteCodes[code] = {
            createdBy: this.currentUser.username,
            createdAt: now,
            expiresAt: now + 30 * 60 * 1000, // 30分钟过期
            used: false,
            usedBy: null
        };
        
        this.saveInviteCodes();
        
        return { 
            valid: true, 
            code: code,
            expiresAt: this.inviteCodes[code].expiresAt
        };
    }

    randomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // 验证邀请码
    validateInviteCode(code) {
        const invite = this.inviteCodes[code];
        if (!invite) return { valid: false, message: '邀请码不存在' };
        if (invite.used) return { valid: false, message: '邀请码已被使用' };
        if (Date.now() > invite.expiresAt) return { valid: false, message: '邀请码已过期（30分钟有效）' };
        return { valid: true, message: '邀请码有效' };
    }

    // 注册（只能通过邀请码）
    register(username, password, inviteCode) {
        const validation = this.validateInviteCode(inviteCode);
        if (!validation.valid) return validation;

        if (this.users[username]) {
            return { valid: false, message: '用户名已存在' };
        }

        const user = {
            username,
            password: this.hashPassword(password),
            inviteCode,
            invitedBy: this.inviteCodes[inviteCode].createdBy,
            createdAt: new Date().toISOString(),
            favorites: [],
            role: 'member'
        };

        this.users[username] = user;
        this.saveUsers();

        // 标记邀请码已使用
        this.inviteCodes[inviteCode].used = true;
        this.inviteCodes[inviteCode].usedBy = username;
        this.inviteCodes[inviteCode].usedAt = new Date().toISOString();
        this.saveInviteCodes();

        // 自动登录
        const token = this.generateToken(user);
        localStorage.setItem('auth_token', token);
        this.currentUser = user;

        return { valid: true, message: '注册成功', token };
    }

    // 登录
    login(username, password) {
        const user = this.users[username];
        if (!user) return { valid: false, message: '用户不存在' };
        if (user.password !== this.hashPassword(password)) {
            return { valid: false, message: '密码错误' };
        }

        const token = this.generateToken(user);
        localStorage.setItem('auth_token', token);
        this.currentUser = user;

        return { valid: true, message: '登录成功', token };
    }

    // 退出登录
    logout() {
        localStorage.removeItem('auth_token');
        this.currentUser = null;
    }

    // 生成 Token（支持中文）
    generateToken(user) {
        const payload = {
            username: user.username,
            role: user.role,
            exp: Date.now() + 30 * 24 * 60 * 60 * 1000
        };
        // 使用 encodeURIComponent 支持中文字符
        return btoa(encodeURIComponent(JSON.stringify(payload)));
    }

    // 验证 Token（支持中文）
    validateToken(token) {
        try {
            const payload = JSON.parse(decodeURIComponent(atob(token)));
            if (payload.exp < Date.now()) {
                localStorage.removeItem('auth_token');
                return null;
            }
            return this.users[payload.username] || null;
        } catch {
            return null;
        }
    }

    // 密码哈希
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // 收藏功能
    addFavorite(itemId) {
        if (!this.currentUser) return false;
        if (!this.currentUser.favorites.includes(itemId)) {
            this.currentUser.favorites.push(itemId);
            this.users[this.currentUser.username].favorites = this.currentUser.favorites;
            this.saveUsers();
        }
        return true;
    }

    removeFavorite(itemId) {
        if (!this.currentUser) return false;
        this.currentUser.favorites = this.currentUser.favorites.filter(id => id !== itemId);
        this.users[this.currentUser.username].favorites = this.currentUser.favorites;
        this.saveUsers();
        return true;
    }

    isFavorite(itemId) {
        return this.currentUser && this.currentUser.favorites.includes(itemId);
    }

    // 获取我的邀请记录
    getMyInvites() {
        if (!this.currentUser) return [];
        return Object.entries(this.inviteCodes)
            .filter(([_, v]) => v.createdBy === this.currentUser.username)
            .map(([code, info]) => ({
                code,
                createdAt: info.createdAt,
                expiresAt: info.expiresAt,
                used: info.used,
                usedBy: info.usedBy,
                status: info.used ? '已使用' : (Date.now() > info.expiresAt ? '已过期' : '有效中')
            }));
    }
}

window.AuthSystem = AuthSystem;
