/**
 * 自动更新脚本
 * - 抓取 GitHub Trending
 * - 生成商业点子
 * - 更新 data.json
 * 
 * 使用方法: node update-data.js
 * 需要环境变量: GITHUB_TOKEN (可选，但推荐)
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const GITHUB_API = 'api.github.com';

// 读取现有数据
function loadData() {
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('读取数据文件失败:', error.message);
        return { lastUpdate: '', dates: [], entries: [] };
    }
}

// 保存数据
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('数据已保存到', DATA_FILE);
}

// 调用 GitHub API
function githubAPI(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: GITHUB_API,
            path: path,
            method: 'GET',
            headers: {
                'User-Agent': 'biz-ideas-hub',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        // 如果有 token，添加认证
        if (process.env.GITHUB_TOKEN) {
            options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('解析响应失败'));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// 获取 GitHub Trending
async function fetchGitHubTrending() {
    console.log('正在获取 GitHub Trending...');
    
    try {
        // 获取最近一周的热门仓库
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const dateStr = oneWeekAgo.toISOString().split('T')[0];
        
        // 搜索最近创建的stars增长快的仓库
        const query = `created:>${dateStr}`;
        const data = await githubAPI(`/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`);
        
        if (!data.items || data.items.length === 0) {
            console.log('未找到热门仓库');
            return [];
        }

        const today = new Date().toISOString().split('T')[0];
        
        return data.items.map(repo => ({
            type: 'github',
            date: today,
            name: repo.full_name,
            author: repo.owner.login,
            avatar: repo.owner.avatar_url,
            url: repo.html_url,
            description: repo.description || '暂无描述',
            language: repo.language || '其他',
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            topics: repo.topics || []
        }));
    } catch (error) {
        console.error('获取 GitHub Trending 失败:', error.message);
        return [];
    }
}

// 生成商业点子（示例：可以从AI服务或模板生成）
function generateBusinessIdeas() {
    const today = new Date().toISOString().split('T')[0];
    
    // 这里可以接入AI服务生成点子
    // 目前使用预定义的模板
    const templates = [
        {
            title: 'AI 驱动的{行业}数据分析服务',
            description: '为{行业}企业提供AI数据分析服务，自动发现业务洞察，生成决策建议报告。',
            tags: ['AI应用', 'SaaS', '数据分析']
        },
        {
            title: '{行业}垂直领域AI助手',
            description: '针对{行业}从业者开发的AI助手，提供专业问答、文档生成、流程优化等功能。',
            tags: ['AI应用', 'SaaS', '效率工具']
        },
        {
            title: 'AI 生成{行业}营销内容',
            description: '为{行业}企业提供AI营销内容生成服务。自动生成文案、图片、视频脚本，提升营销效率。',
            tags: ['AI应用', '营销', '内容']
        }
    ];

    const industries = ['电商', '教育', '医疗', '金融', '法律', '房地产', '餐饮', '旅游'];
    
    // 随机选择生成1-2个点子
    const count = Math.floor(Math.random() * 2) + 1;
    const ideas = [];
    
    for (let i = 0; i < count; i++) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        const industry = industries[Math.floor(Math.random() * industries.length)];
        
        ideas.push({
            type: 'business',
            date: today,
            title: template.title.replace('{行业}', industry),
            description: template.description.replace(/{行业}/g, industry),
            tags: [...template.tags, industry],
            potential: Math.floor(Math.random() * 3) + 3, // 3-5星
            actionItems: [
                `调研${industry}行业痛点`,
                '设计产品MVP',
                '找目标客户验证',
                '制定商业模式'
            ]
        });
    }
    
    return ideas;
}

// 主函数
async function main() {
    console.log('=== 商业点子 & GitHub 热门更新脚本 ===');
    console.log('时间:', new Date().toLocaleString());
    
    // 加载现有数据
    const data = loadData();
    console.log(`现有数据: ${data.entries.length} 条`);
    
    // 获取新数据
    const githubEntries = await fetchGitHubTrending();
    const businessIdeas = generateBusinessIdeas();
    
    const newEntries = [...githubEntries, ...businessIdeas];
    
    if (newEntries.length === 0) {
        console.log('没有新数据，跳过更新');
        return;
    }
    
    // 去重：避免重复添加同一天的内容
    const today = new Date().toISOString().split('T')[0];
    const existingToday = data.entries.filter(e => e.date === today);
    
    if (existingToday.length > 0) {
        console.log(`今天已有 ${existingToday.length} 条数据，跳过更新`);
        return;
    }
    
    // 添加新条目
    data.entries.unshift(...newEntries);
    
    // 更新日期列表
    if (!data.dates.includes(today)) {
        data.dates.unshift(today);
    }
    
    // 更新最后更新时间
    data.lastUpdate = new Date().toISOString();
    
    // 保存
    saveData(data);
    
    console.log(`\n更新完成！`);
    console.log(`新增: ${newEntries.length} 条`);
    console.log(`总计: ${data.entries.length} 条`);
}

// 运行
main().catch(console.error);
