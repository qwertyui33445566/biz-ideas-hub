/**
 * GitHub API 接口
 * 用于服务器端调用 GitHub API（避免前端暴露 Token）
 */

const https = require('https');

const GITHUB_API = 'api.github.com';

function githubRequest(path, token) {
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

        if (token) {
            options.headers['Authorization'] = `token ${token}`;
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

// Vercel Serverless Function
module.exports = async (req, res) => {
    const { type = 'trending' } = req.query;
    const token = process.env.GITHUB_TOKEN;

    try {
        if (type === 'trending') {
            // 获取最近一周的热门仓库
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const dateStr = oneWeekAgo.toISOString().split('T')[0];
            
            const query = `created:>${dateStr}`;
            const data = await githubRequest(
                `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
                token
            );

            res.status(200).json({
                success: true,
                data: data.items || []
            });
        } else if (type === 'repo') {
            const { owner, repo } = req.query;
            const data = await githubRequest(`/repos/${owner}/${repo}`, token);
            res.status(200).json({
                success: true,
                data
            });
        } else {
            res.status(400).json({
                success: false,
                error: '未知的请求类型'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
