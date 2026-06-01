/**
 * 主应用逻辑 v5 — 全面重构
 * - 排行榜/飙升榜排序
 * - 点击式筛选标签
 * - 实时GitHub数据同步标注
 * - 商业潜力评级说明
 */

class App {
    constructor() {
        this.auth = new AuthSystem();
        this.data = { entries: [], dates: [] };
        this.currentTab = 'all';
        this.sortMode = 'newest';
        this.currentSearch = '';
        this.currentDate = 'all';
        this.activeFilters = new Set();
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
                this.activeFilters.clear();
                this.updateTabUI();
                this.render();
            });
        });

        // 排序切换
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.sortMode = e.currentTarget.dataset.sort;
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('sort-active'));
                e.currentTarget.classList.add('sort-active');
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
        loginForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(); });

        // 注册表单
        const registerForm = document.getElementById('register-form');
        registerForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleRegister(); });

        // 生成邀请码
        document.getElementById('generate-invite-btn')?.addEventListener('click', () => {
            if (!this.auth.isLoggedIn()) { alert('请先登录'); return; }
            const code = this.auth.generateInviteCode().code;
            document.getElementById('generated-code').textContent = code;
            document.getElementById('invite-code-display').classList.remove('hidden');
            let seconds = 30 * 60;
            if (this._inviteTimer) clearInterval(this._inviteTimer);
            this._inviteTimer = setInterval(() => {
                seconds--;
                if (seconds <= 0) {
                    clearInterval(this._inviteTimer);
                    document.getElementById('invite-code-display').classList.add('hidden');
                }
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                const el = document.getElementById('countdown-timer');
                if (el) el.textContent = '剩余 ' + m + ':' + String(s).padStart(2, '0');
            }, 1000);
        });

        // 复制邀请码
        document.getElementById('copy-invite-code')?.addEventListener('click', () => {
            const code = document.getElementById('generated-code')?.textContent;
            if (code) navigator.clipboard.writeText(code).then(() => alert('邀请码已复制!'));
        });

        // 登出
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.auth.logout();
            this.checkAuth();
        });

        // 搜索
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.currentSearch = e.target.value;
            this.render();
        });

        // 日期筛选
        document.getElementById('date-filter')?.addEventListener('change', (e) => {
            this.currentDate = e.target.value;
            this.render();
        });

        // 详情弹窗关闭
        document.getElementById('detail-modal-close')?.addEventListener('click', () => this.closeDetail());
        document.getElementById('detail-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'detail-modal') this.closeDetail();
        });

        // 邀请弹窗开关
        document.getElementById('invite-btn')?.addEventListener('click', () => {
            document.getElementById('invite-modal')?.classList.remove('hidden');
        });
        document.getElementById('close-invite-modal')?.addEventListener('click', () => {
            document.getElementById('invite-modal')?.classList.add('hidden');
        });
        document.getElementById('invite-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'invite-modal') document.getElementById('invite-modal').classList.add('hidden');
        });
    }

    // === 认证 ===
    handleLogin() {
        const username = document.getElementById('login-username')?.value;
        const password = document.getElementById('login-password')?.value;
        const errEl = document.getElementById('login-error');
        if (!username || !password) { errEl.textContent = '请输入用户名和密码'; errEl.classList.remove('hidden'); return; }
        const result = this.auth.login(username, password);
        if (result.success) {
            errEl.classList.add('hidden');
            this.showMainContent();
            this.checkAuth();
            this.render();
        } else {
            errEl.textContent = result.message;
            errEl.classList.remove('hidden');
        }
    }

    handleRegister() {
        const username = document.getElementById('register-username')?.value;
        const password = document.getElementById('register-password')?.value;
        const inviteCode = document.getElementById('reg-invite-code')?.value;
        const errEl = document.getElementById('register-error');
        if (!username || !password || !inviteCode) { errEl.textContent = '请填写所有字段'; errEl.classList.remove('hidden'); return; }
        const result = this.auth.register(username, password, inviteCode);
        if (result.success) {
            errEl.classList.add('hidden');
            this.showMainContent();
            this.checkAuth();
            this.render();
        } else {
            errEl.textContent = result.message;
            errEl.classList.remove('hidden');
        }
    }

    checkAuth() {
        const user = this.auth.currentUser;
        if (user) {
            document.getElementById('auth-modal')?.classList.add('hidden');
            document.getElementById('invite-btn')?.classList.remove('hidden');
            document.getElementById('user-info')?.classList.remove('hidden');
            document.getElementById('username-display').textContent = user.username;
        } else {
            document.getElementById('auth-modal')?.classList.remove('hidden');
            document.getElementById('invite-btn')?.classList.add('hidden');
            document.getElementById('user-info')?.classList.add('hidden');
        }
        this.updateTabUI();
    }

    showMainContent() {
        document.getElementById('auth-modal')?.classList.add('hidden');
        document.getElementById('invite-btn')?.classList.remove('hidden');
        document.getElementById('user-info')?.classList.remove('hidden');
    }

    updateTabUI() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('tab-active', btn.dataset.tab === this.currentTab);
        });
        const favCount = this.auth.currentUser?.favorites?.length || 0;
        const favBtn = document.querySelector('[data-tab="favorites"]');
        if (favBtn) favBtn.innerHTML = '❤️ 我的收藏 <span class="ml-1 text-xs">(' + favCount + ')</span>';
    }

    // === 数据加载 ===
    async loadData() {
        document.getElementById('loading').classList.remove('hidden');
        try {
            const response = await fetch('./data.json?t=' + Date.now());
            if (!response.ok) throw new Error('HTTP ' + response.status);
            this.data = await response.json();
            if (this.data.lastUpdate) {
                document.getElementById('last-update').textContent = '最后更新: ' + new Date(this.data.lastUpdate).toLocaleDateString('zh-CN');
            }
            this.updateDateOptions();
        } catch (error) {
            console.error('加载数据失败:', error);
            this.data = { entries: [], dates: [] };
        }
        document.getElementById('loading').classList.add('hidden');
        this.render();
    }

    updateDateOptions() {
        const select = document.getElementById('date-filter');
        if (!select) return;
        select.innerHTML = '<option value="all">全部日期</option>' +
            (this.data.dates || []).map(function(d) { return '<option value="' + d + '">' + d + '</option>'; }).join('');
    }

    // === 筛选 + 排序 ===
    getFilteredEntries() {
        var entries = [].concat(this.data.entries);

        // Tab
        if (this.currentTab === 'business') entries = entries.filter(function(e) { return e.type === 'business'; });
        else if (this.currentTab === 'github') entries = entries.filter(function(e) { return e.type === 'github'; });
        else if (this.currentTab === 'favorites') {
            var self = this;
            entries = entries.filter(function(e) {
                var idx = self.data.entries.indexOf(e);
                var id = e.type === 'business' ? 'biz-' + idx : 'gh-' + idx;
                return self.auth.isFavorite(id);
            });
        }

        // 日期
        if (this.currentDate && this.currentDate !== 'all') {
            entries = entries.filter(function(e) { return e.date === this.currentDate; }, this);
        }

        // 搜索
        if (this.currentSearch) {
            var q = this.currentSearch.toLowerCase();
            entries = entries.filter(function(e) {
                if (e.type === 'business') {
                    return (e.title || '').toLowerCase().indexOf(q) >= 0 ||
                        (e.description || '').toLowerCase().indexOf(q) >= 0 ||
                        (e.tags || []).some(function(t) { return t.toLowerCase().indexOf(q) >= 0; });
                } else {
                    return (e.name || '').toLowerCase().indexOf(q) >= 0 ||
                        (e.description || '').toLowerCase().indexOf(q) >= 0 ||
                        (e.topics || []).some(function(t) { return t.toLowerCase().indexOf(q) >= 0; }) ||
                        (e.language || '').toLowerCase().indexOf(q) >= 0;
                }
            });
        }

        // 标签筛选
        if (this.activeFilters.size > 0) {
            var af = this.activeFilters;
            entries = entries.filter(function(e) {
                var et = new Set();
                if (e.type === 'business') {
                    (e.tags || []).forEach(function(t) { et.add('tag:' + t); });
                    et.add('potential:' + (e.potential || 3));
                } else {
                    (e.topics || []).forEach(function(t) { et.add('topic:' + t); });
                    if (e.language) et.add('lang:' + e.language);
                }
                var match = false;
                af.forEach(function(f) { if (et.has(f)) match = true; });
                return match;
            });
        }

        // 排序
        if (this.sortMode === 'hottest') {
            entries.sort(function(a, b) {
                var sa = a.type === 'github' ? (a.stars || 0) : ((a.potential || 3) * 1000);
                var sb = b.type === 'github' ? (b.stars || 0) : ((b.potential || 3) * 1000);
                return sb - sa;
            });
        } else if (this.sortMode === 'stars') {
            entries.sort(function(a, b) { return (b.stars || 0) - (a.stars || 0); });
        } else {
            entries.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
        }

        return entries;
    }

    // === 筛选标签栏 ===
    buildFilterTags(entries) {
        var tagCounts = new Map();
        entries.forEach(function(e) {
            if (e.type === 'business') {
                (e.tags || []).forEach(function(t) {
                    var k = 'tag:' + t; tagCounts.set(k, (tagCounts.get(k) || 0) + 1);
                });
                var p = e.potential || 3;
                var pk = 'potential:' + p; tagCounts.set(pk, (tagCounts.get(pk) || 0) + 1);
            } else {
                (e.topics || []).forEach(function(t) {
                    var k = 'topic:' + t; tagCounts.set(k, (tagCounts.get(k) || 0) + 1);
                });
                if (e.language) { var lk = 'lang:' + e.language; tagCounts.set(lk, (tagCounts.get(lk) || 0) + 1); }
            }
        });

        var sorted = Array.from(tagCounts.entries()).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 30);
        var container = document.getElementById('filter-tags');
        if (!container) return;
        if (sorted.length === 0) { container.innerHTML = ''; return; }

        var self = this;
        container.innerHTML = sorted.map(function(item) {
            var key = item[0], count = item[1];
            var isActive = self.activeFilters.has(key);
            var label = '', cls = '';
            if (key.indexOf('tag:') === 0) { label = key.slice(4); cls = 'bg-purple-900/50 text-purple-300 border-purple-600/40'; }
            else if (key.indexOf('topic:') === 0) { label = key.slice(6); cls = 'bg-blue-900/50 text-blue-300 border-blue-600/40'; }
            else if (key.indexOf('lang:') === 0) { label = key.slice(5); cls = 'bg-cyan-900/50 text-cyan-300 border-cyan-600/40'; }
            else if (key.indexOf('potential:') === 0) {
                var pv = parseInt(key.slice(10));
                label = '★ '.repeat(pv).trim();
                cls = 'bg-yellow-900/50 text-yellow-300 border-yellow-600/40';
            }
            var activeCls = isActive ? 'ring-2 ring-white/60 opacity-100' : 'opacity-70 hover:opacity-100';
            return '<button class="filter-chip ' + cls + ' ' + activeCls + ' text-xs px-2.5 py-1.5 rounded-full border transition" data-filter="' + key + '">' + label + '<span class="ml-1 opacity-50">' + count + '</span></button>';
        }).join('');

        container.querySelectorAll('.filter-chip').forEach(function(chip) {
            chip.addEventListener('click', function() {
                var key = chip.dataset.filter;
                if (self.activeFilters.has(key)) self.activeFilters.delete(key);
                else self.activeFilters.add(key);
                self.render();
            });
        });
    }

    getFilteredEntriesNoTags() {
        var entries = [].concat(this.data.entries);
        if (this.currentTab === 'business') entries = entries.filter(function(e) { return e.type === 'business'; });
        else if (this.currentTab === 'github') entries = entries.filter(function(e) { return e.type === 'github'; });
        else if (this.currentTab === 'favorites') {
            var self = this;
            entries = entries.filter(function(e) {
                var idx = self.data.entries.indexOf(e);
                var id = e.type === 'business' ? 'biz-' + idx : 'gh-' + idx;
                return self.auth.isFavorite(id);
            });
        }
        if (this.currentDate && this.currentDate !== 'all') entries = entries.filter(function(e) { return e.date === this.currentDate; }, this);
        if (this.currentSearch) {
            var q = this.currentSearch.toLowerCase();
            entries = entries.filter(function(e) {
                if (e.type === 'business') return (e.title || '').toLowerCase().indexOf(q) >= 0 || (e.description || '').toLowerCase().indexOf(q) >= 0 || (e.tags || []).some(function(t) { return t.toLowerCase().indexOf(q) >= 0; });
                else return (e.name || '').toLowerCase().indexOf(q) >= 0 || (e.description || '').toLowerCase().indexOf(q) >= 0 || (e.topics || []).some(function(t) { return t.toLowerCase().indexOf(q) >= 0; });
            });
        }
        return entries;
    }

    // === 渲染 ===
    render() {
        var entries = this.getFilteredEntries();
        var grid = document.getElementById('content-grid');
        var emptyState = document.getElementById('empty-state');
        var countEl = document.getElementById('content-count');
        var tabLabelEl = document.getElementById('tab-label');

        if (!grid) return;

        // 更新计数
        if (countEl) {
            var tabNames = { all: '全部', business: '商业点子', github: 'GitHub项目', favorites: '我的收藏' };
            countEl.textContent = '共 ' + entries.length + ' 条内容';
        }
        if (tabLabelEl) {
            var tabNames2 = { all: '全部', business: '商业点子', github: 'GitHub项目', favorites: '我的收藏' };
            tabLabelEl.textContent = tabNames2[this.currentTab] || '';
        }

        if (entries.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            var self = this;
            grid.innerHTML = entries.map(function(entry) {
                var globalIndex = self.data.entries.indexOf(entry);
                var id = entry.type === 'business' ? 'biz-' + globalIndex : 'gh-' + globalIndex;
                return entry.type === 'business'
                    ? self.renderBusinessCard(entry, id, globalIndex)
                    : self.renderGitHubCard(entry, id, globalIndex);
            }).join('');
        }

        // 构建筛选标签
        this.buildFilterTags(this.getFilteredEntriesNoTags());
    }

    renderBusinessCard(entry, id, index) {
        var isFav = this.auth.isFavorite(id);
        var p = entry.potential || 3;
        var starsHtml = '';
        for (var i = 0; i < 5; i++) starsHtml += i < p ? '★' : '☆';

        return '<div class="glass-card rounded-xl p-5 border border-gray-800 flex flex-col h-full card-hover" onclick="app.showDetail(\'business\', ' + index + ')">' +
            '<div class="flex justify-between items-start mb-3">' +
                '<span class="tag-business text-white text-xs px-3 py-1 rounded-full">💡 商业点子</span>' +
                '<span class="text-yellow-400 text-sm">' + starsHtml + '</span>' +
            '</div>' +
            '<h3 class="text-lg font-bold mb-2 text-white cursor-pointer hover:text-purple-400 transition">' +
                this.esc(entry.title) + ' <i class="fas fa-external-link-alt text-xs text-gray-500"></i>' +
            '</h3>' +
            '<p class="text-gray-400 text-sm mb-4 flex-1 line-clamp-2">' + this.esc(entry.description || '') + '</p>' +
            '<div class="flex flex-wrap gap-1.5 mb-4">' +
                (entry.tags || []).slice(0, 4).map(function(tag) {
                    return '<span class="bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded cursor-pointer hover:bg-purple-800/60" onclick="event.stopPropagation();app.addFilter(\'tag:' + tag + '\')">' + app.esc(tag) + '</span>';
                }).join('') +
            '</div>' +
            '<div class="flex gap-2 mt-auto" onclick="event.stopPropagation()">' +
                '<button onclick="app.showDetail(\'business\', ' + index + ')" class="flex-1 py-2.5 rounded-lg font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition"><i class="fas fa-eye mr-1"></i>查看详情</button>' +
                '<button onclick="app.toggleFavorite(\'' + id + '\', ' + index + ')" class="px-4 py-2.5 rounded-lg font-medium transition text-sm ' + (isFav ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300') + '"><i class="fas fa-heart' + (isFav ? '' : '-o') + '"></i></button>' +
            '</div>' +
        '</div>';
    }

    renderGitHubCard(entry, id, index) {
        var isFav = this.auth.isFavorite(id);
        var starCount = entry.stars || 0;
        var repoName = (entry.name || '').split('/')[1] || entry.name || '';
        var author = entry.author || (entry.name || '').split('/')[0] || '';

        return '<div class="glass-card rounded-xl p-5 border border-gray-800 flex flex-col h-full card-hover" onclick="app.showDetail(\'github\', ' + index + ')">' +
            '<div class="flex items-center mb-3">' +
                '<img src="' + (entry.avatar || '') + '" alt="" class="w-10 h-10 rounded-full mr-3" onerror="this.style.display=\'none\'">' +
                '<div class="flex-1 min-w-0">' +
                    '<h3 class="font-bold text-white truncate">' + this.esc(repoName) + '</h3>' +
                    '<p class="text-xs text-gray-500 truncate">' + this.esc(author) + '</p>' +
                '</div>' +
                '<span class="tag-tech text-white text-xs px-3 py-1 rounded-full ml-2 shrink-0">⚡ GitHub</span>' +
            '</div>' +
            '<p class="text-gray-400 text-sm mb-4 flex-1 line-clamp-2">' + this.esc(entry.description || '暂无描述') + '</p>' +
            '<div class="flex flex-wrap gap-1.5 mb-2" onclick="event.stopPropagation()">' +
                (entry.topics || []).slice(0, 4).map(function(topic) {
                    return '<span class="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded cursor-pointer hover:bg-blue-800/60" onclick="event.stopPropagation();app.addFilter(\'topic:' + topic + '\')">' + app.esc(topic) + '</span>';
                }).join('') +
            '</div>' +
            '<div class="flex items-center gap-3 mb-4 text-xs text-gray-400 flex-wrap" onclick="event.stopPropagation()">' +
                (entry.language ? '<span class="cursor-pointer hover:text-cyan-400" onclick="event.stopPropagation();app.addFilter(\'lang:' + entry.language + '\')"><span class="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 mr-1"></span>' + this.esc(entry.language) + '</span>' : '') +
                '<span>⭐ ' + this.formatNumber(starCount) + '</span>' +
                '<span>🍴 ' + this.formatNumber(entry.forks || 0) + '</span>' +
            '</div>' +
            '<div class="flex gap-2 mt-auto" onclick="event.stopPropagation()">' +
                '<a href="' + (entry.url || '#') + '" target="_blank" class="flex-1 py-2.5 text-center bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition text-gray-300"><i class="fab fa-github mr-1"></i>查看项目</a>' +
                '<button onclick="app.toggleFavorite(\'' + id + '\', ' + index + ')" class="px-4 py-2.5 rounded-lg font-medium transition text-sm ' + (isFav ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300') + '"><i class="fas fa-heart' + (isFav ? '' : '-o') + '"></i></button>' +
            '</div>' +
        '</div>';
    }

    addFilter(key) {
        this.activeFilters.add(key);
        this.render();
    }

    toggleFavorite(id, index) {
        if (!this.auth.isLoggedIn()) { alert('请先登录'); return; }
        this.auth.toggleFavorite(id);
        this.auth.saveUsers();
        this.updateTabUI();
        this.render();
    }

    // === 详情弹窗 ===
    showDetail(type, index) {
        var entry = this.data.entries[index];
        if (!entry) return;
        var titleEl = document.getElementById('detail-title');
        var bodyEl = document.getElementById('detail-body');

        if (type === 'business') {
            var p = entry.potential || 3;
            var starsHtml = '';
            for (var i = 0; i < 5; i++) starsHtml += i < p ? '★' : '☆';
            var pLabels = ['', '', '⭐ 观察中 — 概念阶段，需验证', '⭐⭐ 有潜力 — 市场初步验证', '⭐⭐⭐ 高潜力 — 需求明确，可切入', '🌟🌟 强烈推荐 — 蓝海窗口，立刻行动'];

            titleEl.textContent = entry.title;
            bodyEl.innerHTML =
                '<div class="mb-4">' +
                '<div class="flex justify-between items-start mb-4">' +
                    '<span class="tag-business text-white text-xs px-3 py-1 rounded-full">💡 商业点子</span>' +
                    '<div class="text-right">' +
                        '<span class="text-yellow-400 text-lg">' + starsHtml + '</span>' +
                        '<p class="text-xs text-gray-400 mt-1">' + (pLabels[p] || '') + '</p>' +
                    '</div>' +
                '</div>' +
                '<p class="text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">' + this.esc(entry.description || '') + '</p>' +
                '<div class="flex flex-wrap gap-2 mb-4">' +
                    (entry.tags || []).map(function(tag) {
                        return '<span class="bg-purple-900/50 text-purple-300 text-xs px-3 py-1 rounded cursor-pointer hover:bg-purple-800/60" onclick="app.addFilter(\'tag:' + tag + '\')">' + app.esc(tag) + '</span>';
                    }).join('') +
                '</div>' +
                '<p class="text-gray-500 text-sm"><i class="far fa-calendar mr-2"></i>' + (entry.date || '') + '</p>' +
                '</div>' +
                (entry.actionItems && entry.actionItems.length ? '<div class="mt-6 bg-gray-900/50 rounded-lg p-4"><h4 class="text-white font-bold mb-3"><i class="fas fa-tasks mr-2 text-purple-400"></i>行动项建议</h4><ul class="text-gray-400 text-sm space-y-2">' + entry.actionItems.map(function(item) { return '<li class="py-2 border-b border-gray-700 last:border-0">' + app.esc(item) + '</li>'; }).join('') + '</ul></div>' : '') +
                '<div class="mt-4 grid grid-cols-3 gap-3 text-center text-xs">' +
                    '<div class="bg-gray-900/50 rounded-lg p-3"><div class="text-cyan-400 font-bold">' + (entry.marketSize || '中等') + '</div><div class="text-gray-500 mt-1">市场规模</div></div>' +
                    '<div class="bg-gray-900/50 rounded-lg p-3"><div class="text-green-400 font-bold">' + (entry.competition || '低') + '</div><div class="text-gray-500 mt-1">竞争程度</div></div>' +
                    '<div class="bg-gray-900/50 rounded-lg p-3"><div class="text-yellow-400 font-bold">' + (entry.investment || '¥5-50万') + '</div><div class="text-gray-500 mt-1">启动资金</div></div>' +
                '</div>';
        } else {
            var repoName = (entry.name || '').split('/')[1] || entry.name || '';
            titleEl.textContent = repoName;
            bodyEl.innerHTML =
                '<div class="mb-4">' +
                '<div class="flex items-center mb-4">' +
                    '<img src="' + (entry.avatar || '') + '" class="w-12 h-12 rounded-full mr-4" onerror="this.style.display=\'none\'">' +
                    '<div><h3 class="font-bold text-white">' + this.esc(entry.name || '') + '</h3><p class="text-gray-500 text-sm">' + this.esc(entry.author || '') + '</p></div>' +
                '</div>' +
                '<p class="text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">' + this.esc(entry.description || '暂无描述') + '</p>' +
                '<div class="flex flex-wrap gap-2 mb-4">' +
                    (entry.topics || []).map(function(topic) {
                        return '<span class="bg-blue-900/50 text-blue-300 text-xs px-3 py-1 rounded cursor-pointer hover:bg-blue-800/60" onclick="app.addFilter(\'topic:' + topic + '\')">' + app.esc(topic) + '</span>';
                    }).join('') +
                '</div>' +
                '<div class="flex gap-4 text-gray-400 text-sm mb-4 flex-wrap">' +
                    (entry.language ? '<span><span class="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1"></span>' + this.esc(entry.language) + '</span>' : '') +
                    '<span>⭐ ' + ((entry.stars || 0).toLocaleString()) + '</span>' +
                    '<span>🍴 ' + ((entry.forks || 0).toLocaleString()) + '</span>' +
                '</div>' +
                '<a href="' + (entry.url || '#') + '" target="_blank" class="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition"><i class="fab fa-github mr-2"></i>前往 GitHub</a>' +
                '</div>';
        }
        document.getElementById('detail-modal').classList.remove('hidden');
    }

    closeDetail() {
        document.getElementById('detail-modal').classList.add('hidden');
    }

    formatNumber(num) {
        if (!num && num !== 0) return '0';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return String(num);
    }

    esc(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
}

const app = new App();