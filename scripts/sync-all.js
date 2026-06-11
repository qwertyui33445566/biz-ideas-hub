/**
 * sync-all.js — 全量同步脚本
 * 1. 从 business-ideas.md 导入新商业点子
 * 2. 从 github-trending-pushed.json 导入新 GitHub 项目
 * 3. 调用 GitHub API 更新 stars/forks（可选，需 token）
 * 4. 保存 data.json
 * 5. Git commit + push（可选）
 * 
 * 用法:
 *   node scripts/sync-all.js                      # 同步数据，不 git push
 *   node scripts/sync-all.js --push                # 同步 + push
 *   node scripts/sync-all.js --push --token=ghp_xxx # 全量
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_PATH = path.resolve(__dirname, '../data.json');
const IDEAS_PATH = path.resolve(__dirname, '../../business-ideas.md');
const PUSHED_PATH = path.resolve(__dirname, '../../memory/github-trending-pushed.json');
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Parse CLI args
const args = {};
process.argv.slice(2).forEach(a => {
    if (a.startsWith('--')) {
        const eq = a.indexOf('=');
        if (eq > -1) args[a.slice(2, eq)] = a.slice(eq + 1);
        else args[a.slice(2)] = true;
    }
});
const DO_PUSH = args['push'];
const GITHUB_TOKEN = args['token'];
const TLS_OFF = 'NODE_TLS_REJECT_UNAUTHORIZED=0';

// ==========================================
// 1. Load existing data
// ==========================================
function loadData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch {
        return { entries: [], dates: [] };
    }
}

function saveData(data) {
    data.lastUpdate = new Date().toISOString();
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ==========================================
// 2. Sync business ideas from business-ideas.md
// ==========================================
function syncBusinessIdeas(data) {
    if (!fs.existsSync(IDEAS_PATH)) {
        console.log('  ⚠️  business-ideas.md 不存在，跳过');
        return 0;
    }

    const content = fs.readFileSync(IDEAS_PATH, 'utf8');
    const blocks = content.split(/^---$/m).filter(b => b.trim());

    let added = 0;
    for (const block of blocks) {
        // Parse: ## 2026-06-11 - 标题
        const headerMatch = block.match(/^##\s+(\d{4}-\d{2}-\d{2})\s*[-—]\s*(.+)$/m);
        if (!headerMatch) continue;

        const date = headerMatch[1];
        const title = headerMatch[2].trim();

        // Skip if already in data
        const exists = data.entries.some(e =>
            e.type === 'business' && e.date === date && e.title === title
        );
        if (exists) continue;

        // Extract body (everything after header)
        const body = block.replace(/^##\s+.+$/m, '').trim();

        // Extract tags from content (keywords in parentheses or after #)
        const tags = [];
        const tagPatterns = block.match(/(?:标签|tags?|keywords?):\s*(.+)/gi);
        if (tagPatterns) {
            tagPatterns.forEach(t => {
                t.split(/[,，、]/).forEach(tag => {
                    const clean = tag.replace(/^(?:标签|tags?|keywords?):\s*/i, '').trim();
                    if (clean) tags.push(clean);
                });
            });
        }

        // Auto-generate tags from content keywords
        const autoTags = new Set(tags);
        const keywords = ['宠物', '折叠', '露营', '户外', 'AI', '跨境', '电商', '京东', '蓝海',
            '供应链', '高增长', '低竞争', '智能家居', '健康', '母婴', '汽车', '食品',
            '新能源', '养老', '宠物', '盲盒', '手工', '二手', '租赁', '定制'];
        keywords.forEach(kw => {
            if (body.includes(kw) && autoTags.size < 5) autoTags.add(kw);
        });

        // Estimate potential based on content analysis
        let potential = 3;
        if (/蓝海|空白|垄断|刚需|爆发|高增长/i.test(body)) potential = 5;
        else if (/有潜力|初步验证|需求明确/i.test(body)) potential = 4;
        else if (/观察|概念|验证/i.test(body)) potential = 2;
        else if (/红海|饱和|竞争激烈/i.test(body)) potential = 1;

        // Market metrics from content
        const marketSize = /千亿|万亿|大市场/i.test(body) ? '大' : /亿/i.test(body) ? '中等' : '待验证';
        const competition = /蓝海|空白|无竞争|低竞争/i.test(body) ? '低' : /红海|激烈|饱和/i.test(body) ? '高' : '中';

        data.entries.push({
            type: 'business',
            date: date,
            title: title,
            description: body,
            tags: Array.from(autoTags),
            potential: potential,
            marketSize: marketSize,
            competition: competition,
            investment: /5.*万|小投入/i.test(body) ? '¥5-50万' : /100.*万/i.test(body) ? '¥50-500万' : '待评估',
            actionItems: []
        });

        added++;
        console.log('  ✅ +' + title + ' (' + date + ')');
    }

    // Rebuild dates array
    data.dates = [...new Set(data.entries.map(e => e.date))].sort().reverse();
    return added;
}

// ==========================================
// 3. Sync GitHub repos from pushed.json
// ==========================================
function syncGitHubPushed(data) {
    if (!fs.existsSync(PUSHED_PATH)) {
        console.log('  ⚠️  github-trending-pushed.json 不存在，跳过');
        return 0;
    }

    const pushed = JSON.parse(fs.readFileSync(PUSHED_PATH, 'utf8'));
    let added = 0;

    for (const [repoName, info] of Object.entries(pushed)) {
        // Check if already in data
        const exists = data.entries.some(e =>
            e.type === 'github' && e.name === repoName
        );
        if (exists) {
            // Update stars if we have newer data
            const entry = data.entries.find(e => e.type === 'github' && e.name === repoName);
            if (entry && info.stars && (!entry.stars || entry.stars < info.stars)) {
                entry.stars = info.stars;
            }
            continue;
        }

        // Extract date from pushedAt
        const pushedDate = info.pushedAt ? info.pushedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

        // Extract author and repo name
        const parts = repoName.split('/');
        const author = parts[0];
        const repoShortName = parts[1] || repoName;

        data.entries.push({
            type: 'github',
            name: repoName,
            author: author,
            description: info.desc || '',
            stars: info.stars || 0,
            forks: 0,
            language: info.language || '',
            topics: info.topics || [],
            url: 'https://github.com/' + repoName,
            avatar: 'https://github.com/' + author + '.png',
            date: pushedDate,
            stars_synced: false,
            synced_at: null
        });

        added++;
        console.log('  ✅ +' + repoName + ' (' + info.stars + '⭐, ' + pushedDate + ')');
    }

    // Rebuild dates array
    data.dates = [...new Set(data.entries.map(e => e.date))].sort().reverse();
    return added;
}

// ==========================================
// 4. GitHub API stars sync (optional)
// ==========================================
function syncGitHubAPI(data, token) {
    if (!token) {
        console.log('  ℹ️  无 Token，跳过 API 同步');
        return;
    }

    // Dynamic require to avoid loading https when not needed
    const https = require('https');

    function githubRequest(path) {
        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.github.com',
                path: path,
                headers: {
                    'User-Agent': 'biz-ideas-hub/1.0',
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': 'token ' + token
                },
                method: 'GET',
                rejectUnauthorized: false
            }, res => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    githubRequest(new URL(res.headers.location).pathname).then(resolve).catch(reject);
                    return;
                }
                if (res.statusCode === 404) { resolve(null); return; }
                if (res.statusCode === 403) { reject(new Error('Rate limited')); return; }
                if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Parse error')); } });
            });
            req.on('error', reject);
            req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
            req.end();
        });
    }

    const ghEntries = data.entries.filter(e => e.type === 'github');
    console.log('  📡 API 同步 ' + ghEntries.length + ' 个仓库...');

    (async () => {
        let updated = 0;
        for (let i = 0; i < ghEntries.length; i++) {
            const e = ghEntries[i];
            if (i > 0) await new Promise(r => setTimeout(r, 200));
            try {
                const repo = await githubRequest('/repos/' + e.name);
                if (!repo) continue;
                const oldStars = e.stars || 0;
                e.stars = repo.stargazers_count;
                e.forks = repo.forks_count;
                e.language = repo.language || e.language;
                if (repo.description) e.description = repo.description;
                if (repo.owner?.avatar_url) e.avatar = repo.owner.avatar_url;
                e.stars_synced = true;
                e.synced_at = new Date().toISOString();
                const diff = e.stars - oldStars;
                console.log('  ⭐ ' + e.name.split('/')[1] + ': ' + e.stars.toLocaleString() + (diff ? ' (+' + diff + ')' : ''));
                updated++;
            } catch (err) {
                if (err.message === 'Rate limited') {
                    console.log('  ⛔ API 限流，停止同步');
                    break;
                }
                console.log('  ❌ ' + e.name + ': ' + err.message);
            }
        }
        saveData(data);
        console.log('  ✅ API 同步完成，更新 ' + updated + ' 个仓库');
    })();
}

// ==========================================
// Main
// ==========================================
console.log('🔄 开始全量同步...\n');

const data = loadData();
const prevCount = data.entries.length;

console.log('📥 1. 同步商业点子 (business-ideas.md)');
const ideasAdded = syncBusinessIdeas(data);
console.log('  新增: ' + ideasAdded + '\n');

console.log('📥 2. 同步 GitHub 项目 (github-trending-pushed.json)');
const ghAdded = syncGitHubPushed(data);
console.log('  新增: ' + ghAdded + '\n');

const totalAdded = ideasAdded + ghAdded;

// Save data first (before API sync, which is async)
saveData(data);
console.log('💾 data.json 已保存 (' + data.entries.length + ' 条, ' + data.dates.length + ' 天)');

if (GITHUB_TOKEN) {
    console.log('');
    console.log('📡 3. GitHub API 同步 (更新真实 Stars/Forks)');
    syncGitHubAPI(data, GITHUB_TOKEN);
} else {
    console.log('\n💡 提示: 加 --token=ghp_xxx 可同步真实 Stars 数据');
}

// Git push
if (DO_PUSH) {
    console.log('\n🚀 Git commit + push...');
    try {
        execSync('git add -A', { cwd: PROJECT_ROOT, stdio: 'pipe' });
        execSync('git commit -m "sync: ' + new Date().toISOString().slice(0, 10) + ' 新增' + totalAdded + '条数据"', { cwd: PROJECT_ROOT, stdio: 'pipe' });
        execSync('git push github main', { cwd: PROJECT_ROOT, stdio: 'pipe', env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' } });
        console.log('  ✅ 已推送至 GitHub Pages');
    } catch (err) {
        console.log('  ⚠️  Git push 失败:', err.message);
    }
} else {
    console.log('\n💡 提示: 加 --push 可自动 commit + push');
}

console.log('\n📊 同步汇总:');
console.log('  总条目: ' + prevCount + ' → ' + data.entries.length + ' (+' + totalAdded + ')');
console.log('  商业点子: ' + ideasAdded);
console.log('  GitHub 项目: ' + ghAdded);