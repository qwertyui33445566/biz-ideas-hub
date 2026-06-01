/**
 * 主应用逻辑
 * - 加载数据
 * - 搜索、筛选、收藏
 * - 邀请码管理
 */

class App {
    constructor() {
        this.auth = new AuthSystem();
        this.data = { entries: [], dates: [] };
        this.filteredEntries = [];
        this.currentFilter = { type: 'all', category: 'all', date: 'all', search: '', tag: 'all' };
        this.countdownInterval = null;
        this.init();
    }

    async init() {
        console.log('App初始化开始...');
        this.setupEventListeners();
        this.checkAuth();
        await this.loadData();
        this.render();
        console.log('App初始化完成');
    }

    setupEventListeners() {
        console.log('设置事件监听器...');
        
        // 登录/注册切换
        const switchToRegister = document.getElementById('switch-to-register');
        const switchToLogin = document.getElementById('switch-to-login');
        
        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-form-container').classList.add('hidden');
                document.getElementById('register-form-container').classList.remove('hidden');
            });
        }
        
        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('register-form-container').classList.add('hidden');
                document.getElementById('login-form-container').classList.remove('hidden');
            });
        }

        // 登录表单
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('登录表单提交');
                const username = document.getElementById('login-username').value;
                const password = document.getElementById('login-password').value;
                console.log('尝试登录:', username);
                const result = this.auth.login(username, password);
                console.log('登录结果:', result);
                if (result.valid) {
                    this.onLoginSuccess();
                } else {
                    alert(result.message);
                }
            });
        }

        // 注册表单
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('注册表单提交');
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
        }

        // 退出登录
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.auth.logout();
                location.reload();
            });
        }

        // 邀请码按钮
        const inviteBtn = document.getElementById('invite-btn');
        if (inviteBtn) {
            inviteBtn.addEventListener('click', () => {
                this.showInviteModal();
            });
        }
        
        const closeInviteModal = document.getElementById('close-invite-modal');
        if (closeInviteModal) {
            closeInviteModal.addEventListener('click', () => {
                this.hideInviteModal();
            });
        }
        
        const generateInviteBtn = document.getElementById('generate-invite-btn');
        if (generateInviteBtn) {
            generateInviteBtn.addEventListener('click', () => {
                this.generateInviteCode();
            });
        }
        
        const copyInviteCode = document.getElementById('copy-invite-code');
        if (copyInviteCode) {
            copyInviteCode.addEventListener('click', () => {
                const code = document.getElementById('generated-code').textContent;
                navigator.clipboard.writeText(code).then(() => {
                    alert('邀请码已复制！');
                });
            });
        }

        // 筛选器
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilter.search = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }
        
        const typeFilter = document.getElementById('type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilter.type = e.target.value;
                this.updateCategoryOptions();
                this.applyFilters();
            });
        }
        
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilter.category = e.target.value;
                this.applyFilters();
            });
        }
        
        const dateFilter = document.getElementById('date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.currentFilter.date = e.target.value;
                this.applyFilters();
            });
        }
        
        console.log('事件监听器设置完成');
    }

    checkAuth() {
        console.log('检查登录状态...');
        if (this.auth.isLoggedIn()) {
            console.log('用户已登录:', this.auth.getCurrentUser().username);
            this.onLoginSuccess();
        } else {
            console.log('用户未登录');
        }
    }

    onLoginSuccess() {
        console.log('登录成功，更新UI...');
        const authModal = document.getElementById('auth-modal');
        const userInfo = document.getElementById('user-info');
        const usernameDisplay = document.getElementById('username-display');
        const inviteBtn = document.getElementById('invite-btn');
        
        if (authModal) authModal.classList.add('hidden');
        if (userInfo) userInfo.classList.remove('hidden');
        if (usernameDisplay) usernameDisplay.textContent = this.auth.getCurrentUser().username;
        if (inviteBtn) inviteBtn.classList.remove('hidden');
        
        console.log('UI更新完成');
    }

    showInviteModal() {
        document.getElementById('invite-modal').classList.remove('hidden');
        this.renderMyInvites();
    }

    hideInviteModal() {
        document.getElementById('invite-modal').classList.add('hidden');
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
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
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        
        const updateTimer = () => {
            const remaining = expiresAt - Date.now();
            if (remaining <= 0) {
                document.getElementById('countdown-timer').textContent = '已过期';
                clearInterval(this.countdownInterval);
                return;
            }
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            document.getElementById('countdown-timer').textContent = 
                `剩余时间: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        
        updateTimer();
        this.countdownInterval = setInterval(updateTimer, 1000);
    }

    renderMyInvites() {
        const invites = this.auth.getMyInvites();
        const container = document.getElementById('invites-list');
        
        if (invites.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-400">暂无邀请记录</p>';
            document.getElementById('my-invites').classList.remove('hidden');
            return;
        }

        container.innerHTML = invites.map(invite => `
            <div class="flex justify-between items-center bg-gray-50 rounded p-2 text-sm">
                <div>
                    <span class="font-mono font-medium">${invite.code}</span>
                    <span class="text-xs text-gray-400 ml-2">${new Date(invite.createdAt).toLocaleDateString()}</span>
                </div>
                <span class="text-xs px-2 py-1 rounded ${invite.status === '有效中' ? 'bg-green-100 text-green-700' : invite.status === '已使用' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'}">${invite.status}</span>
            </div>
        `).join('');
        
        document.getElementById('my-invites').classList.remove('hidden');
    }

    async loadData() {
        document.getElementById('loading').classList.remove('hidden');
        try {
            // 尝试多种路径加载数据
            let response;
            try {
                response = await fetch('./data.json?t=' + Date.now());
            } catch (e) {
                response = await fetch('data.json?t=' + Date.now());
            }
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            
            this.data = await response.json();
            this.filteredEntries = [...this.data.entries];
            this.updateDateOptions();
            this.updateCategoryOptions();
            this.render(); // 加载完数据后渲染
        } catch (error) {
            console.error('加载数据失败:', error);
            // 使用备用数据
            this.loadFallbackData();
        }
        document.getElementById('loading').classList.add('hidden');
    }
    
    // 备用数据（当无法加载 data.json 时使用）
    loadFallbackData() {
        console.log('使用备用数据...');
        this.data = {
            lastUpdate: new Date().toISOString(),
            dates: [new Date().toISOString().split('T')[0]],
            entries: [
                {
                    type: 'business',
                    date: new Date().toISOString().split('T')[0],
                    title: '示例商业点子',
                    description: '这是一个示例商业点子，实际数据需要从 data.json 加载。',
                    tags: ['示例'],
                    potential: 3,
                    actionItems: ['检查 data.json 文件路径', '确保文件在正确的目录']
                },
                {
                    type: 'github',
                    date: new Date().toISOString().split('T')[0],
                    name: '示例项目',
                    author: '示例作者',
                    description: '这是一个示例GitHub项目，实际数据需要从 data.json 加载。',
                    language: 'JavaScript',
                    stars: 100,
                    forks: 50,
                    url: 'https://github.com/example/example'
                }
            ]
        };
        this.filteredEntries = [...this.data.entries];
        this.updateDateOptions();
        this.updateCategoryOptions();
        this.render();
    }

    updateDateOptions() {
        const select = document.getElementById('date-filter');
        select.innerHTML = '<option value="all">全部日期</option>';
        this.data.dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            select.appendChild(option);
        });
    }

    updateCategoryOptions() {
        const select = document.getElementById('category-filter');
        const type = this.currentFilter.type;
        
        let options = '<option value="all">全部分类</option>';
        
        if (type === 'all' || type === 'business') {
            options += `
                <optgroup label="商业点子">
                    <option value="AI应用">AI应用</option>
                    <option value="SaaS">SaaS</option>
                    <option value="电商">电商</option>
                    <option value="内容">内容</option>
                    <option value="硬件">硬件</option>
                    <option value="服务">服务</option>
                </optgroup>
            `;
        }
        
        if (type === 'all' || type === 'github') {
            options += `
                <optgroup label="编程语言">
                    <option value="JavaScript">JavaScript</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="Python">Python</option>
                    <option value="Go">Go</option>
                    <option value="Rust">Rust</option>
                    <option value="其他">其他</option>
                </optgroup>
            `;
        }
        
        select.innerHTML = options;
    }

    applyFilters() {
        this.filteredEntries = this.data.entries.filter(entry => {
            // 类型筛选
            if (this.currentFilter.type !== 'all' && entry.type !== this.currentFilter.type) return false;
            
            // 日期筛选
            if (this.currentFilter.date !== 'all' && entry.date !== this.currentFilter.date) return false;
            
            // 分类筛选
            if (this.currentFilter.category !== 'all') {
                if (entry.type === 'business') {
                    if (!entry.tags || !entry.tags.includes(this.currentFilter.category)) return false;
                } else if (entry.type === 'github') {
                    const lang = entry.language || '其他';
                    if (this.currentFilter.category === '其他') {
                        if (['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust'].includes(lang)) return false;
                    } else if (lang !== this.currentFilter.category) {
                        return false;
                    }
                }
            }
            
            // 搜索
            if (this.currentFilter.search) {
                const searchText = this.currentFilter.search;
                const text = entry.type === 'business' 
                    ? `${entry.title} ${entry.description} ${entry.tags?.join(' ') || ''}`
                    : `${entry.name} ${entry.description} ${entry.language || ''}`;
                if (!text.toLowerCase().includes(searchText)) return false;
            }
            
            return true;
        });
        
        this.render();
    }

    render() {
        const grid = document.getElementById('content-grid');
        
        if (this.filteredEntries.length === 0) {
            grid.innerHTML = '';
            document.getElementById('empty-state').classList.remove('hidden');
            return;
        }
        
        document.getElementById('empty-state').classList.add('hidden');
        
        grid.innerHTML = this.filteredEntries.map((entry, index) => {
            if (entry.type === 'business') {
                return this.renderBusinessCard(entry, index);
            } else {
                return this.renderGitHubCard(entry, index);
            }
        }).join('');
    }

    renderBusinessCard(entry, index) {
        const id = `biz-${index}`;
        const isFav = this.auth.isFavorite(id);
        const potential = '★'.repeat(entry.potential || 3) + '☆'.repeat(5 - (entry.potential || 3));
        
        return `
            <div class="bg-white rounded-xl shadow-sm p-6 card-hover fade-in" style="animation-delay: ${index * 0.05}s">
                <div class="flex justify-between items-start mb-3">
                    <span class="tag-business text-white text-xs px-3 py-1 rounded-full">商业点子</span>
                    <button onclick="app.toggleFavorite('${id}')" class="text-${isFav ? 'red' : 'gray'}-400 hover:text-red-500 transition">
                        <i class="fas fa-heart${isFav ? '' : '-o'}"></i>
                    </button>
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">${entry.title}</h3>
                <p class="text-gray-600 text-sm mb-3 line-clamp-3">${entry.description}</p>
                <div class="flex flex-wrap gap-2 mb-3">
                    ${(entry.tags || []).map(tag => `<span class="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded">${tag}</span>`).join('')}
                </div>
                <div class="flex justify-between items-center text-sm text-gray-500">
                    <span>潜力: <span class="text-yellow-500">${potential}</span></span>
                    <span>${entry.date}</span>
                </div>
                ${entry.actionItems ? `
                    <div class="mt-3 pt-3 border-t border-gray-100">
                        <p class="text-xs text-gray-400 mb-1">行动建议:</p>
                        <ul class="text-xs text-gray-600 space-y-1">
                            ${entry.actionItems.slice(0, 3).map(item => `<li>• ${item}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderGitHubCard(entry, index) {
        const id = `gh-${index}`;
        const isFav = this.auth.isFavorite(id);
        
        return `
            <div class="bg-white rounded-xl shadow-sm p-6 card-hover fade-in" style="animation-delay: ${index * 0.05}s">
                <div class="flex justify-between items-start mb-3">
                    <span class="tag-tech text-white text-xs px-3 py-1 rounded-full">GitHub</span>
                    <button onclick="app.toggleFavorite('${id}')" class="text-${isFav ? 'red' : 'gray'}-400 hover:text-red-500 transition">
                        <i class="fas fa-heart${isFav ? '' : '-o'}"></i>
                    </button>
                </div>
                <div class="flex items-center mb-3">
                    <img src="${entry.avatar}" alt="${entry.author}" class="w-8 h-8 rounded-full mr-2">
                    <div>
                        <h3 class="text-sm font-bold text-gray-900">${entry.name}</h3>
                        <p class="text-xs text-gray-500">${entry.author}</p>
                    </div>
                </div>
                <p class="text-gray-600 text-sm mb-3 line-clamp-3">${entry.description}</p>
                <div class="flex flex-wrap gap-2 mb-3">
                    ${entry.language ? `<span class="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">${entry.language}</span>` : ''}
                    ${(entry.topics || []).slice(0, 3).map(topic => `<span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">${topic}</span>`).join('')}
                </div>
                <div class="flex justify-between items-center text-sm text-gray-500">
                    <div class="flex items-center space-x-3">
                        <span><i class="fas fa-star text-yellow-400 mr-1"></i>${this.formatNumber(entry.stars)}</span>
                        <span><i class="fas fa-code-branch text-gray-400 mr-1"></i>${this.formatNumber(entry.forks)}</span>
                    </div>
                    <span>${entry.date}</span>
                </div>
                <a href="${entry.url}" target="_blank" class="mt-3 block text-center py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm">
                    <i class="fab fa-github mr-2"></i>查看项目
                </a>
            </div>
        `;
    }

    toggleFavorite(itemId) {
        if (!this.auth.isLoggedIn()) {
            alert('请先登录');
            return;
        }
        
        if (this.auth.isFavorite(itemId)) {
            this.auth.removeFavorite(itemId);
        } else {
            this.auth.addFavorite(itemId);
        }
        this.render();
    }

    formatNumber(num) {
        if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num;
    }
}

// 初始化
const app = new App();
