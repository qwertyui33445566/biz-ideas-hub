/**
 * 主应用逻辑 - v4
 * - Tab 切换：全部 / 商业点子 / GitHub项目 / 我的收藏
 * - 收藏按钮突出
 * - 详情弹窗
 */

class App {
    constructor() {
        this.auth = new AuthSystem();
        this.data = { entries: [], dates: [] };
        this.currentTab = 'all';
        this.currentFilter = { search: '', date: 'all' };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.checkAuth();
        await this.loadData();
    }

    setupEventListeners() {
        // Tab 切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentTab = e.currentTarget.dataset.tab;
                this.updateTabUI();
                this.render();
            });
        });

        // 登录/注册切换
        document.getElementById('switch-to-register')?.addEventListener('click', () => {
            document.getElementById('login-form-container').classList.add('hidden');
            document.getElementById('register-form-container').classList.remove('hidden');
        });
        
        document.getElementById('switch-to-login')?.addEventListener('click', () => {
            document.getElementById('register-form-container').classList.add('hidden');
            document.getElementById('login-form-container').classList.remove('hidden');
        });

        // 登录表单
        const loginForm = document.getElementById('login-form');
        const loginBtn = loginForm?.querySelector('button[type="submit"]');
        
        loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        loginBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // 注册表单
        const registerForm = document.getElementById('register-form');
        const registerBtn = registerForm?.querySelector('button[type="submit"]');
        
        registerForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        registerBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // 生成邀请码
        document.getElementById('generate-invite')?.addEventListener('click', () => {
            if (!this.auth.isLoggedIn()) {
                alert('请先登录');
                return;
            }
            const code = this.auth.generateInviteCode();
            document.getElementById('invite-code-display').textContent = code;
            document.getElementById('invite-code-container').classList.remove('hidden');
            
            // 30分钟倒计时
            let seconds = 30 * 60;
            const timer = setInterval(() => {
                seconds--;
                if (seconds <= 0) {
                    clearInterval(timer);
                    document.getElementById('invite-code-container').classList.add('hidden');
                }
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                document.getElementById('invite-countdown').textContent = 
                    `剩余 ${m}:${s.toString().padStart(2, '0')}`;
            }, 1000);
        });

        // 登出
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.auth.logout();
            this.checkAuth();
        });

        // 搜索
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.currentFilter.search = e.target.value;
            this.render();
        });

        // 日期筛选
        document.getElementById('date-filter')?.addEventListener('change', (e) => {
            this.currentFilter.date = e.target.value;
            this.render();
        });

        // 详情弹窗关闭
        document.getElementById('detail-modal-close')?.addEventListener('click', () => {
            this.closeDetail();
        });
        document.getElementById('detail-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'detail-modal') this.closeDetail();
        });
    }

    handleLogin() {
        const username = document.getElementById('login-username')?.value;
        const password = document.getElementById('login-password')?.value;
        
        if (!username || !password) {
            document.getElementById('login-error').textContent = '请输入用户名和密码';
            return;
        }
        
        const result = this.auth.login(username, password);
        
        if (result.success) {
            this.showMainContent();
            this.checkAuth();
            this.render();
        } else {
            document.getElementById('login-error').textContent = result.message;
        }
    }

    handleRegister() {
        const username = document.getElementById('register-username')?.value;
        const password = document.getElementById('register-password')?.value;
        const inviteCode = document.getElementById('register-invite-code')?.value;
        
        const result = this.auth.register(username, password, inviteCode);
        
        if (result.success) {
            this.showMainContent();
            this.checkAuth();
            this.render();
        } else {
            document.getElementById('register-error').textContent = result.message;
        }
    }

    checkAuth() {
        const user = this.auth.currentUser;
        if (user) {
            // 隐藏登录弹窗
            document.getElementById('auth-modal')?.classList.add('hidden');
            // 显示用户信息
            document.getElementById('invite-btn')?.classList.remove('hidden');
            document.getElementById('user-info')?.classList.remove('hidden');
            document.getElementById('username-display').textContent = user.username;
        } else {
            // 显示登录弹窗
            document.getElementById('auth-modal')?.classList.remove('hidden');
            // 隐藏用户信息
            document.getElementById('invite-btn')?.classList.add('hidden');
            document.getElementById('user-info')?.classList.add('hidden');
        }
        this.updateTabUI();
    }

    showMainContent() {
        // 隐藏登录弹窗
        document.getElementById('auth-modal')?.classList.add('hidden');
        // 显示用户信息
        document.getElementById('invite-btn')?.classList.remove('hidden');
        document.getElementById('user-info')?.classList.remove('hidden');
    }

    updateTabUI() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === this.currentTab) {
                btn.classList.add('tab-active');
            } else {
                btn.classList.remove('tab-active');
            }
        });

        // 更新收藏计数
        const favCount = this.auth.currentUser?.favorites?.length || 0;
        const favBtn = document.querySelector('[data-tab="favorites"]');
        if (favBtn) {
            favBtn.innerHTML = `❤️ 我的收藏 <span class="ml-1 text-xs">(${favCount})</span>`;
        }
    }

    updateDateOptions() {
        const select = document.getElementById('date-filter');
        if (!select) return;
        
        const dates = this.data.dates || [];
        select.innerHTML = '<option value="all">全部日期</option>' + 
            dates.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    async loadData() {
        document.getElementById('loading').classList.remove('hidden');
        try {
            const response = await fetch('./data.json?t=' + Date.now());
            if (!response.ok) throw new Error('HTTP ' + response.status);
            this.data = await response.json();
            
            if (this.data.lastUpdate) {
                document.getElementById('last-update').textContent = 
                    '最后更新: ' + new Date(this.data.lastUpdate).toLocaleDateString('zh-CN');
            }
            
            this.updateDateOptions();
        } catch (error) {
            console.error('加载数据失败:', error);
            this.data = this.getFallbackData();
        }
        document.getElementById('loading').classList.add('hidden');
        this.render();
    }

    getFallbackData() {
        return {
            lastUpdate: new Date().toISOString(),
            dates: [new Date().toISOString().split('T')[0]],
            entries: []
        };
    }

    getFilteredEntries() {
        let entries = [...this.data.entries];
        
        // Tab 筛选
        if (this.currentTab === 'business') {
            entries = entries.filter(e => e.type === 'business');
        } else if (this.currentTab === 'github') {
            entries = entries.filter(e => e.type === 'github');
        } else if (this.currentTab === 'favorites') {
            entries = entries.filter(e => {
                const id = e.type === 'business' 
                    ? `biz-${this.data.entries.indexOf(e)}` 
                    : `gh-${this.data.entries.indexOf(e)}`;
                return this.auth.isFavorite(id);
            });
        }
        
        // 日期筛选
        if (this.currentFilter.date !== 'all') {
            entries = entries.filter(e => e.date === this.currentFilter.date);
        }
        
        // 搜索筛选
        if (this.currentFilter.search) {
            const q = this.currentFilter.search.toLowerCase();
            entries = entries.filter(e => {
                if (e.type === 'business') {
                    return e.title.toLowerCase().includes(q) ||
                        e.description.toLowerCase().includes(q) ||
                        (e.tags || []).some(t => t.toLowerCase().includes(q));
                } else {
                    return e.name.toLowerCase().includes(q) ||
                        e.description.toLowerCase().includes(q) ||
                        (e.topics || []).some(t => t.toLowerCase().includes(q));
                }
            });
        }
        
        return entries;
    }

    render() {
        const entries = this.getFilteredEntries();
        const grid = document.getElementById('content-grid');
        const emptyState = document.getElementById('empty-state');
        
        if (!grid) return;
        
        if (entries.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        grid.innerHTML = entries.map((entry) => {
            const globalIndex = this.data.entries.indexOf(entry);
            const id = entry.type === 'business' ? `biz-${globalIndex}` : `gh-${globalIndex}`;
            
            if (entry.type === 'business') {
                return this.renderBusinessCard(entry, id, globalIndex);
            } else {
                return this.renderGitHubCard(entry, id, globalIndex);
            }
        }).join('');
    }

    renderBusinessCard(entry, id, index) {
        const isFav = this.auth.isFavorite(id);
        const stars = '★'.repeat(entry.potential || 3) + '☆'.repeat(5 - (entry.potential || 3));
        
        return `
            <div class="glass-card rounded-xl p-5 border border-gray-800 flex flex-col h-full">
                <div class="flex justify-between items-start mb-3">
                    <span class="tag-business text-white text-xs px-3 py-1 rounded-full">💡 商业点子</span>
                    <span class="text-yellow-400 text-sm">${stars}</span>
                </div>
                
                <h3 class="text-lg font-bold mb-2 text-white cursor-pointer hover:text-purple-400" 
                    onclick="app.showDetail('business', ${index})">
                    ${entry.title} <i class="fas fa-external-link-alt text-xs text-gray-500"></i>
                </h3>
                <p class="text-gray-400 text-sm mb-4 flex-1">${entry.description}</p>
                
                <div class="flex flex-wrap gap-2 mb-4">
                    ${(entry.tags || []).slice(0, 3).map(tag => 
                        `<span class="bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded">${tag}</span>`
                    ).join('')}
                </div>
                
                <div class="flex gap-2">
                    <button onclick="app.showDetail('business', ${index})"
                        class="flex-1 py-3 rounded-lg font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
                        <i class="fas fa-eye mr-2"></i>查看详情
                    </button>
                    <button onclick="app.toggleFavorite('${id}', ${index})" 
                        class="px-5 py-3 rounded-lg font-medium transition ${isFav 
                            ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white' 
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}">
                        <i class="fas fa-heart${isFav ? '' : '-o'} mr-1"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderGitHubCard(entry, id, index) {
        const isFav = this.auth.isFavorite(id);
        
        return `
            <div class="glass-card rounded-xl p-5 border border-gray-800 flex flex-col h-full">
                <div class="flex items-center mb-3">
                    <img src="${entry.avatar}" alt="${entry.author}" class="w-10 h-10 rounded-full mr-3" 
                        onerror="this.src='https://github.com/ghost.png'">
                    <div class="flex-1">
                        <h3 class="font-bold text-white">${entry.name.split('/')[1] || entry.name}</h3>
                        <p class="text-xs text-gray-500">${entry.author}</p>
                    </div>
                    <span class="tag-tech text-white text-xs px-3 py-1 rounded-full">⚡ GitHub</span>
                </div>
                
                <p class="text-gray-400 text-sm mb-4 flex-1">${entry.description || '暂无描述'}</p>
                
                <div class="flex flex-wrap gap-2 mb-2">
                    ${(entry.topics || []).slice(0, 4).map(topic => 
                        `<span class="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded">${topic}</span>`
                    ).join('')}
                </div>
                
                <div class="flex items-center gap-4 mb-4 text-sm text-gray-400">
                    ${entry.language ? `<span><i class="fas fa-code mr-1"></i>${entry.language}</span>` : ''}
                    <span><i class="fas fa-star text-yellow-400 mr-1"></i>${this.formatNumber(entry.stars)}</span>
                    <span><i class="fas fa-code-branch mr-1"></i>${this.formatNumber(entry.forks)}</span>
                </div>
                
                <div class="flex gap-2">
                    <a href="${entry.url}" target="_blank" 
                        class="flex-1 py-3 text-center bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition text-gray-300">
                        <i class="fab fa-github mr-1"></i>查看项目
                    </a>
                    <button onclick="app.toggleFavorite('${id}', ${index})" 
                        class="px-5 py-3 rounded-lg font-medium transition ${isFav 
                            ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white' 
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}">
                        <i class="fas fa-heart${isFav ? '' : '-o'} mr-1"></i>
                    </button>
                </div>
            </div>
        `;
    }

    toggleFavorite(id, index) {
        if (!this.auth.isLoggedIn()) {
            alert('请先登录');
            return;
        }
        
        this.auth.toggleFavorite(id);
        this.auth.saveUsers();
        
        // 更新收藏按钮样式
        const btns = document.querySelectorAll(`[onclick="app.toggleFavorite('${id}', ${index})"]`);
        btns.forEach(btn => {
            const isFav = this.auth.isFavorite(id);
            if (isFav) {
                btn.className = 'px-5 py-3 rounded-lg font-medium transition bg-gradient-to-r from-pink-600 to-rose-600 text-white';
                btn.innerHTML = '<i class="fas fa-heart mr-1"></i>';
            } else {
                btn.className = 'px-5 py-3 rounded-lg font-medium transition bg-gray-800 hover:bg-gray-700 text-gray-300';
                btn.innerHTML = '<i class="fas fa-heart-o mr-1"></i>';
            }
        });
        
        // 更新Tab计数
        this.updateTabUI();
        
        // 如果在收藏Tab且取消收藏，刷新列表
        if (this.currentTab === 'favorites' && !this.auth.isFavorite(id)) {
            this.render();
        }
    }

    showDetail(type, index) {
        const entry = this.data.entries[index];
        if (!entry) return;
        
        if (type === 'business') {
            const stars = '★'.repeat(entry.potential || 3) + '☆'.repeat(5 - (entry.potential || 3));
            const actionItems = (entry.actionItems || []).map(item => 
                `<li class="py-2 border-b border-gray-700 last:border-0 text-gray-300">${item}</li>`
            ).join('');
            
            document.getElementById('detail-title').textContent = entry.title;
            document.getElementById('detail-body').innerHTML = `
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-4">
                        <span class="tag-business text-white text-xs px-3 py-1 rounded-full">💡 商业点子</span>
                        <span class="text-yellow-400">${stars}</span>
                    </div>
                    <p class="text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">${entry.description}</p>
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${(entry.tags || []).map(tag => 
                            `<span class="bg-purple-900/50 text-purple-300 text-xs px-3 py-1 rounded">${tag}</span>`
                        ).join('')}
                    </div>
                    <p class="text-gray-500 text-sm"><i class="far fa-calendar mr-2"></i>${entry.date}</p>
                </div>
                ${actionItems ? `
                <div class="mt-6">
                    <h4 class="text-white font-bold mb-3"><i class="fas fa-tasks mr-2"></i>行动项</h4>
                    <ul class="text-gray-400 text-sm space-y-2">${actionItems}</ul>
                </div>` : ''}
            `;
        } else {
            document.getElementById('detail-title').textContent = entry.name.split('/')[1] || entry.name;
            document.getElementById('detail-body').innerHTML = `
                <div class="mb-4">
                    <div class="flex items-center mb-4">
                        <img src="${entry.avatar}" class="w-12 h-12 rounded-full mr-4" onerror="this.src='https://github.com/ghost.png'">
                        <div>
                            <h3 class="font-bold text-white">${entry.name}</h3>
                            <p class="text-gray-500 text-sm">${entry.author}</p>
                        </div>
                    </div>
                    <p class="text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">${entry.description || '暂无描述'}</p>
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${(entry.topics || []).map(topic => 
                            `<span class="bg-blue-900/50 text-blue-300 text-xs px-3 py-1 rounded">${topic}</span>`
                        ).join('')}
                    </div>
                    <div class="flex gap-4 text-gray-400 text-sm mb-4">
                        ${entry.language ? `<span><i class="fas fa-code mr-1"></i>${entry.language}</span>` : ''}
                        <span><i class="fas fa-star text-yellow-400 mr-1"></i>${entry.stars?.toLocaleString()}</span>
                        <span><i class="fas fa-code-branch mr-1"></i>${entry.forks?.toLocaleString()}</span>
                    </div>
                    <a href="${entry.url}" target="_blank" 
                        class="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition">
                        <i class="fab fa-github mr-2"></i>前往 GitHub
                    </a>
                </div>
            `;
        }
        
        document.getElementById('detail-modal').classList.remove('hidden');
    }

    closeDetail() {
        document.getElementById('detail-modal').classList.add('hidden');
    }

    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num;
    }
}

const app = new App();
