/**
 * sync-all.js — 全量同步脚本 (优化版 v2.0)
 * 
 * 优化内容:
 * 1. 修复异步问题 - API同步完成后才保存
 * 2. 统一文件路径 - 所有文件放在 biz-ideas-hub 目录内
 * 3. 增加 push 重试机制 (3次重试，间隔10秒)
 * 4. 支持环境变量配置 Token
 * 
 * 用法:
 *   node scripts/sync-all.js                      # 同步数据，不 git push
 *   node scripts/sync-all.js --push                # 同步 + push
 *   node scripts/sync-all.js --push --token=ghp_xxx # 全量同步
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==========================================
// 路径配置 (统一放在 biz-ideas-hub 目录内)
// ==========================================
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(PROJECT_ROOT, 'data.json');
const MEMORY_DIR = path.join(PROJECT_ROOT, 'memory');
const PUSHED_PATH = path.join(MEMORY_DIR, 'github-trending-pushed.json');
const IDEAS_PATH = path.join(PROJECT_ROOT, '../business-ideas.md'); // workspace/business-ideas.md

// 确保 memory 目录存在
if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

// ==========================================
// CLI 参数解析
// ==========================================
const args = {};
process.argv.slice(2).forEach(a => {
    if (a.startsWith('--')) {
        const eq = a.indexOf('=');
        if (eq > -1) args[a.slice(2, eq)] = a.slice(eq + 1);
        else args[a.slice(2)] = true;
    }
});

const DO_PUSH = args['push'];
// 优先使用命令行参数，其次使用环境变量
const GITHUB_TOKEN = args['token'] || process.env.GITHUB_TOKEN;
const PUSH_RETRY = 3;  // push 重试次数
const PUSH_RETRY_DELAY = 10000; // 重试间隔 10秒

// ==========================================
// 辅助函数
// ==========================================
function loadData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch {
        return { entries: [], dates: [], lastUpdate: null };
    }
}

function saveData(data) {
    data.lastUpdate = new Date().toISOString();
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// 1. 同步商业点子
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
        const headerMatch = block.match(/^##\s+(\d{4}-\d{2}-\d{2})\s*[-—]\s*(.+)$/m);
        if (!headerMatch) continue;

        const date = headerMatch[1];
        const title = headerMatch[2].trim();

        // 去重检查
        const exists = data.entries.some(e =>
            e.type === 'business' && e.date === date && e.title === title
        );
        if (exists) continue;

        const body = block.replace(/^##\s+.+$/m, '').trim();

        // 提取标签
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

        // 自动生成标签
        const autoTags = new Set(tags);
        const keywords = ['宠物', '折叠', '露营', '户外', 'AI', '跨境', '电商', '京东', '蓝海',
            '供应链', '高增长', '低竞争', '智能家居', '健康', '母婴', '汽车', '食品',
            '新能源', '养老', '盲盒', '手工', '二手', '租赁', '定制'];
        keywords.forEach(kw => {
            if (body.includes(kw) && autoTags.size < 5) autoTags.add(kw);
        });

        // 潜力评估
        let potential = 3;
        if (/蓝海|空白|垄断|刚需|爆发|高增长/i.test(body)) potential = 5;
        else if (/有潜力|初步验证|需求明确/i.test(body)) potential = 4;
        else if (/观察|概念|验证/i.test(body)) potential = 2;
        else if (/红海|饱和|竞争激烈/i.test(body)) potential = 1;

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
    }

    return added;
}

// ==========================================
// 2. 同步 GitHub 项目
// ==========================================
function syncGitHubPushed(data) {
    if (!fs.existsSync(PUSHED_PATH)) {
        console.log('  ⚠️  github-trending-pushed.json 不存在，创建空文件');
        fs.writeFileSync(PUSHED_PATH, '{}', 'utf8');
        return 0;
    }

    try {
        const pushed = JSON.parse(fs.readFileSync(PUSHED_PATH, 'utf8') || '{}');
        let added = 0;

        for (const [fullName, info] of Object.entries(pushed)) {
            const exists = data.entries.some(e => e.type === 'github' && e.name === fullName);
            if (exists) continue;

            data.entries.push({
                type: 'github',
                name: fullName,
                author: fullName.split('/')[0],
                description: info.desc || '',
                stars: info.stars || 0,
                forks: info.forks || 0,
                language: info.language || '',
                topics: info.topics || [],
                url: 'https://github.com/' + fullName,
                avatar: info.avatar || '',
                date: info.pushedAt ? info.pushedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
                stars_synced: false,
                synced_at: null
            });
            added++;
        }

        return added;
    } catch (e) {
        console.log('  ⚠️  github-trending-pushed.json 解析失败:', e.message);
        return 0;
    }
}

// ==========================================
// 3. GitHub API 同步 (异步，返回 Promise)
// ==========================================
async function syncGitHubAPI(data, token) {
    const https = require('https');

    function githubRequest(reqPath) {
        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.github.com',
                path: reqPath,
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
                res.on('end', () => {
                    try { resolve(JSON.parse(body)); }
                    catch { reject(new Error('Parse error')); }
                });
            });
            req.on('error', reject);
            req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
            req.end();
        });
    }

    const ghEntries = data.entries.filter(e => e.type === 'github');
    console.log('  📡 API 同步 ' + ghEntries.length + ' 个仓库...');

    let updated = 0;
    for (let i = 0; i < ghEntries.length; i++) {
        const e = ghEntries[i];
        if (i > 0) await sleep(200);

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

    console.log('  ✅ API 同步完成，更新 ' + updated + ' 个仓库');
    return updated;
}

// ==========================================
// 4. Git Push (带重试机制)
// ==========================================
async function gitPush(retryCount = PUSH_RETRY) {
    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            console.log('  🚀 Git push (尝试 ' + attempt + '/' + retryCount + ')...');
            execSync('git add -A', { cwd: PROJECT_ROOT, stdio: 'pipe' });
            execSync('git commit -m "sync: ' + new Date().toISOString().slice(0, 10) + '"', { cwd: PROJECT_ROOT, stdio: 'pipe' });
            execSync('git push github main', {
                cwd: PROJECT_ROOT,
                stdio: 'pipe',
                env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' }
            });
            console.log('  ✅ 已推送至 GitHub');
            return true;
        } catch (err) {
            console.log('  ⚠️  Git push 失败 (' + attempt + '):', err.message);
            if (attempt < retryCount) {
                console.log('  ⏳ ' + (PUSH_RETRY_DELAY / 1000) + '秒后重试...');
                await sleep(PUSH_RETRY_DELAY);
            }
        }
    }
    console.log('  ❌ Git push 多次失败，请手动处理');
    return false;
}

// ==========================================
// 主流程
// ==========================================
async function main() {
    console.log('🔄 开始全量同步...\n');

    const data = loadData();
    const prevCount = data.entries.length;

    // 1. 同步商业点子
    console.log('📥 1. 同步商业点子 (business-ideas.md)');
    const ideasAdded = syncBusinessIdeas(data);
    console.log('   新增: ' + ideasAdded + '\n');

    // 2. 同步 GitHub 项目
    console.log('📥 2. 同步 GitHub 项目 (github-trending-pushed.json)');
    const ghAdded = syncGitHubPushed(data);
    console.log('   新增: ' + ghAdded + '\n');

    const totalAdded = ideasAdded + ghAdded;

    // 3. GitHub API 同步 (如果需要)
    if (GITHUB_TOKEN) {
        console.log('📡 3. GitHub API 同步 (更新真实 Stars/Forks)');
        await syncGitHubAPI(data, GITHUB_TOKEN); // 等待完成再保存
        console.log('');
    } else {
        console.log('💡 提示: 设置 GITHUB_TOKEN 环境变量或加 --token=ghp_xxx 可同步 Stars\n');
    }

    // 4. 保存 data.json
    saveData(data);
    console.log('💾 data.json 已保存 (' + data.entries.length + ' 条, ' + data.dates.length + ' 天)');

    // 5. Git Push (带重试)
    if (DO_PUSH) {
        const pushed = await gitPush();
        if (!pushed) {
            console.log('\n⚠️  提示: Git push 失败，可稍后手动运行:');
            console.log('   node scripts/sync-all.js --push --token=' + (GITHUB_TOKEN ? 'xxx' : ''));
        }
    } else {
        console.log('\n💡 提示: 加 --push 可自动 commit + push');
    }

    // 汇总
    console.log('\n📊 同步汇总:');
    console.log('   总条目: ' + prevCount + ' → ' + data.entries.length + ' (+' + totalAdded + ')');
    console.log('   商业点子: ' + ideasAdded);
    console.log('   GitHub 项目: ' + ghAdded);
}

main().catch(err => {
    console.error('❌ 同步失败:', err.message);
    process.exit(1);
});
