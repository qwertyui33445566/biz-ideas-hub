/**
 * 主应用逻辑 - 重构版
 * - Tab 切换：全部 / 商业点子 / GitHub项目 / 我的收藏
 * - 简洁卡片设计
 * - 收藏功能突出
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
        this.render();
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
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const result = this.auth.login(username, password);
            if (result.valid) {
                this.onLoginSuccess();
            } else {
                alert(result.message);
            }
        });

        // 注册表单
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            const inviteCode = document.getElementById('reg-invite-code').value;
            const result = this.auth.register(username, password, inviteCode);
            if (result.valid) {
                this.onLoginSuccess();
            } else {
                alert(result.message);
            }
        });

        // 退出
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.auth.logout();
            location.reload();
        });

        // 邀请码
        document.getElementById('invite-btn')?.addEventListener('click', () => {
            document.getElementById('invite-modal').classList.remove('hidden');
            this.renderMyInvites();
        });

        document.getElementById('close-invite-modal')?.addEventListener('click', () => {
            document.getElementById('invite-modal').classList.add('hidden');
        });

        document.getElementById('generate-invite-btn')?.addEventListener('click', () => {
            this.generateInviteCode();
        });

        document.getElementById('copy-invite-code')?.addEventListener('click', () => {
            const code = document.getElementById('generated-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                alert('邀请码已复制！');
            });
        });

        // 搜索
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.currentFilter.search = e.target.value.toLowerCase();
            this.render();
        });

        // 日期筛选
        document.getElementById('date-filter')?.addEventListener('change', (e) => {
            this.currentFilter.date = e.target.value;
            this.render();
        });
    }

    updateTabUI() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === this.currentTab) {
                btn.classList.add('tab-active');
                btn.classList.remove('glass-card');
            } else {
                btn.classList.remove('tab-active');
                btn.classList.add('glass-card');
            }
        });

        if (this.currentTab === 'favorites') {
            const favCount = this.getFavoriteEntries().length;
            document.getElementById('favorites-count').classList.remove('hidden');
            document.getElementById('favorites-count').innerHTML = 
                `<i class="fas fa-heart text-pink-400 mr-1"></i>收藏 ${favCount} 条`;
        } else {
            document.getElementById('favorites-count').classList.add('hidden');
        }
    }

    checkAuth() {
        if (this.auth.isLoggedIn()) {
            this.onLoginSuccess();
        }
    }

    onLoginSuccess() {
        document.getElementById('auth-modal').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('invite-btn').classList.remove('hidden');
        document.getElementById('username-display').textContent = this.auth.getCurrentUser().username;
    }

    generateInviteCode() {
        const result = this.auth.generateInviteCode();
        if (result.valid) {
            document.getElementById('generated-code').textContent = result.code;
            document.getElementById('invite-code-display').classList.remove('hidden');
            this.startCountdown(result.expiresAt);
            this.renderMyInvites();
        } else {
            alert(result.message);
        }
    }

    startCountdown(expiresAt) {
        const updateTimer = () => {
            const remaining = expiresAt - Date.now();
            if (remaining <= 0) {
                document.getElementById('countdown-timer').textContent = '已过期';
                return;
            }
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            document.getElementById('countdown-timer').textContent = 
                `剩余: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    renderMyInvites() {
        const invites = this.auth.getMyInvites();
        const container = document.getElementById('invites-list');
        if (!invites.length) {
            container.innerHTML = '<p class="text-sm text-gray-500">暂无邀请记录</p>';
        } else {
            container.innerHTML = invites.map(invite => `
                <div class="flex justify-between items-center bg-black/20 rounded p-2 text-sm">
                    <span class="font-mono text-cyan-400">${invite.code}</span>
                    <span class="text-xs ${invite.status === '有效中' ? 'text-green-400' : 'text-gray-500'}">${invite.status}</span>
                </div>
            `).join('');
        }
        document.getElementById('my-invites').classList.remove('hidden');
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
            // 使用内置数据
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

    updateDateOptions() {
        const select = document.getElementById('date-filter');
        select.innerHTML = '<option value="all">全部日期</option>';
        this.data.dates.slice(0, 14).forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            select.appendChild(option);
        });
    }

    getFilteredEntries() {
        let entries = this.data.entries || [];
        
        if (this.currentTab === 'business') {
            entries = entries.filter(e => e.type === 'business');
        } else if (this.currentTab === 'github') {
            entries = entries.filter(e => e.type === 'github');
        } else if (this.currentTab === 'favorites') {
            entries = this.getFavoriteEntries();
        }
        
        if (this.currentFilter.date !== 'all') {
            entries = entries.filter(e => e.date === this.currentFilter.date);
        }
        
        if (this.currentFilter.search) {
            const search = this.currentFilter.search;
            entries = entries.filter(e => {
                if (e.type === 'business') {
                    return e.title?.toLowerCase().includes(search) || 
                           e.description?.toLowerCase().includes(search) ||
                           e.tags?.some(t => t.toLowerCase().includes(search));
                } else {
                    return e.name?.toLowerCase().includes(search) ||
                           e.description?.toLowerCase().includes(search) ||
                           e.language?.toLowerCase().includes(search);
                }
            });
        }
        
        return entries;
    }

    getFavoriteEntries() {
        const user = this.auth.getCurrentUser();
        if (!user || !user.favorites) return [];
        
        return this.data.entries.filter((e, i) => {
            const id = e.type === 'business' ? `biz-${i}` : `gh-${i}`;
            return user.favorites.includes(id);
        });
    }

    render() {
        const grid = document.getElementById('content-grid');
        const entries = this.getFilteredEntries();
        
        if (this.currentTab === 'favorites') {
            const favCount = this.getFavoriteEntries().length;
            document.getElementById('content-count').textContent = `收藏 ${favCount} 条`;
        } else {
            document.getElementById('content-count').textContent = `共 ${entries.length} 条`;
        }
        
        if (entries.length === 0) {
            grid.innerHTML = '';
            document.getElementById('empty-state').classList.remove('hidden');
            return;
        }
        
        document.getElementById('empty-state').classList.add('hidden');
        
        grid.innerHTML = entries.map((entry, realIndex) => {
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
            <div class="glass-card rounded-xl p-5 card-hover border border-gray-800">
                <div class="flex justify-between items-start mb-3">
                    <span class="tag-business text-white text-xs px-3 py-1 rounded-full">💡 商业点子</span>
                    <button onclick="app.toggleFavorite('${id}', ${index})" 
                        class="fav-btn text-2xl ${isFav ? 'fav-active' : 'text-gray-600 hover:text-pink-400'}">
                        <i class="fas fa-heart${isFav ? '' : '-o'}"></i>
                    </button>
                </div>
                
                <h3 class="text-lg font-bold mb-2 text-white">${entry.title}</h3>
                <p class="text-gray-400 text-sm mb-4 line-clamp-3">${entry.description}</p>
                
                <div class="flex flex-wrap gap-2 mb-4">
                    ${(entry.tags || []).slice(0, 3).map(tag => 
                        `<span class="bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded">${tag}</span>`
                    ).join('')}
                </div>
                
                <div class="flex justify-between items-center text-sm">
                    <span class="text-yellow-400">${stars}</span>
                    <span class="text-gray-500">${entry.date}</span>
                </div>
            </div>
        `;
    }

    renderGitHubCard(entry, id, index) {
        const isFav = this.auth.isFavorite(id);
        
        return `
            <div class="glass-card rounded-xl p-5 card-hover border border-gray-800">
                <div class="flex justify-between items-start mb-3">
                    <span class="tag-tech text-white text-xs px-3 py-1 rounded-full">⚡ GitHub</span>
                    <button onclick="app.toggleFavorite('${id}', ${index})" 
                        class="fav-btn text-2xl ${isFav ? 'fav-active' : 'text-gray-600 hover:text-pink-400'}">
                        <i class="fas fa-heart${isFav ? '' : '-o'}"></i>
                    </button>
                </div>
                
                <div class="flex items-center mb-3">
                    <img src="${entry.avatar}" alt="${entry.author}" class="w-10 h-10 rounded-full mr-3" 
                        onerror="this.src='https://github.com/ghost.png'">
                    <div>
                        <h3 class="font-bold text-white">${entry.name.split('/')[1] || entry.name}</h3>
                        <p class="text-xs text-gray-500">${entry.author}</p>
                    </div>
                </div>
                
                <p class="text-gray-400 text-sm mb-4 line-clamp-2">${entry.description || '暂无描述'}</p>
                
                <div class="flex items-center gap-4 mb-4 text-sm text-gray-400">
                    ${entry.language ? `<span><i class="fas fa-code mr-1"></i>${entry.language}</span>` : ''}
                    <span><i class="fas fa-star text-yellow-400 mr-1"></i>${this.formatNumber(entry.stars)}</span>
                    <span><i class="fas fa-code-branch mr-1"></i>${this.formatNumber(entry.forks)}</span>
                </div>
                
                <div class="flex justify-between items-center">
                    <span class="text-gray-500 text-sm">${entry.date}</span>
                    <a href="${entry.url}" target="_blank" 
                        class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
                        <i class="fab fa-github mr-1"></i>查看
                    </a>
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
        
        if (this.currentTab === 'favorites') {
            this.render();
        } else {
            const btn = document.querySelector(`[onclick="app.toggleFavorite('${id}', ${index})"]`);
            if (btn) {
                const isFav = this.auth.isFavorite(id);
                btn.className = `fav-btn text-2xl ${isFav ? 'fav-active' : 'text-gray-600 hover:text-pink-400'}`;
                btn.innerHTML = `<i class="fas fa-heart${isFav ? '' : '-o'}"></i>`;
            }
        }
        
        if (this.currentTab === 'favorites') {
            this.updateTabUI();
        }
    }

    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num;
    }
}

const app = new App();
