/**
 * GitHub 数据同步脚本
 * 调用 GitHub API 获取项目真实 Stars/Forks/Language
 * 用法: node scripts/sync-github.js [--token=ghp_xxx]
 */

const fs = require('fs');
const https = require('https');

const DATA_PATH = __dirname + '/../data.json';
const GITHUB_TOKEN = process.argv.find(a => a.startsWith('--token='))?.split('=')[1] || process.env.GITHUB_TOKEN;

const BASE_HEADERS = {
    'User-Agent': 'biz-ideas-hub/1.0',
    'Accept': 'application/vnd.github.v3+json'
};
if (GITHUB_TOKEN) {
    BASE_HEADERS['Authorization'] = 'token ' + GITHUB_TOKEN;
}

function githubRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: path,
            headers: BASE_HEADERS,
            method: 'GET',
            rejectUnauthorized: false
        };
        const req = https.request(options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                githubRequest(new URL(res.headers.location).pathname).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode === 403 && res.headers['x-ratelimit-remaining'] === '0') {
                const resetAt = new Date(parseInt(res.headers['x-ratelimit-reset']) * 1000);
                reject(new Error('API 速率限制, 重置时间: ' + resetAt.toLocaleString()));
                return;
            }
            if (res.statusCode === 404) {
                resolve(null); // 仓库不存在
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error('HTTP ' + res.statusCode + ' for ' + path));
                return;
            }
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

async function syncRepo(repoFullName) {
    const repo = await githubRequest('/repos/' + repoFullName);
    if (!repo) {
        console.log('  ⚠️ 仓库未找到:', repoFullName);
        return null;
    }
    // 获取话题标签（需要单独请求，带特殊 Accept header）
    let topics = [];
    try {
        const topicsData = await githubRequest('/repos/' + repoFullName + '/topics');
        if (topicsData && topicsData.names) {
            topics = topicsData.names;
        }
    } catch (e) {
        // 未认证请求可能无法获取 topics
    }

    return {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        description: repo.description,
        topics: topics.length > 0 ? topics : undefined,
        avatar: repo.owner?.avatar_url,
        stars_synced: true,
        synced_at: new Date().toISOString()
    };
}

async function main() {
    console.log('🔍 开始同步 GitHub 数据...');
    if (GITHUB_TOKEN) {
        console.log('  使用 Token 认证 (速率限制: 5000/小时)');
    } else {
        console.log('  无 Token (速率限制: 60/小时)');
    }

    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const githubEntries = data.entries.filter(e => e.type === 'github');

    console.log('  待同步项目:', githubEntries.length, '个\n');

    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < githubEntries.length; i++) {
        const entry = githubEntries[i];
        const repoName = entry.name;
        
        // 节流
        if (i > 0) {
            await new Promise(r => setTimeout(r, GITHUB_TOKEN ? 200 : 1500));
        }

        process.stdout.write('  [' + (i + 1) + '/' + githubEntries.length + '] ' + repoName + ' ... ');
        try {
            const live = await syncRepo(repoName);
            if (!live) {
                console.log('404 跳过');
                skipped++;
                entry.stars_synced = entry.stars_synced || false;
                continue;
            }
            
            const oldStars = entry.stars || 0;
            entry.stars = live.stars;
            entry.forks = live.forks;
            entry.language = live.language || entry.language;
            if (live.description) entry.description = live.description;
            if (live.topics) entry.topics = live.topics.slice(0, 8);
            if (live.avatar) entry.avatar = live.avatar;
            entry.stars_synced = true;
            entry.synced_at = live.synced_at;

            const diff = live.stars - oldStars;
            const diffStr = diff > 0 ? ' +' + diff : diff < 0 ? ' ' + diff : '';
            console.log('⭐ ' + live.stars.toLocaleString() + diffStr);
            updated++;
        } catch (e) {
            console.log('❌ ' + e.message);
            failed++;
            entry.stars_synced = entry.stars_synced || false;
        }
    }

    // 更新 lastUpdate
    data.lastUpdate = new Date().toISOString();

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
    
    console.log('\n📊 同步完成:');
    console.log('  更新: ' + updated + ' | 失败: ' + failed + ' | 跳过: ' + skipped);
    console.log('  文件: ' + DATA_PATH + ' (' + (fs.statSync(DATA_PATH).size / 1024).toFixed(1) + ' KB)');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });