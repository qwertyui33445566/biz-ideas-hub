# 商业点子 & GitHub 热门项目聚合站

一个聚合每日商业点子和 GitHub Trending 项目的会员制网站。

## 功能特性

- **每日自动更新**: 自动抓取 GitHub Trending 和生成商业点子
- **会员邀请制**: 只有已登录会员可以生成邀请码，邀请码30分钟内有效
- **搜索与筛选**: 支持按类型、分类、日期、关键词搜索
- **收藏功能**: 会员可以收藏感兴趣的内容
- **响应式设计**: 支持桌面和移动端访问

## 技术栈

- 前端: HTML + Tailwind CSS + JavaScript
- 数据: JSON 文件存储
- 部署: Vercel / Netlify（免费）

## 部署指南

### 1. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

### 2. 部署到 Netlify

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 登录
netlify login

# 部署
netlify deploy --prod --dir=.
```

### 3. GitHub Pages（需要改为纯前端数据加载）

由于 GitHub Pages 是静态托管，需要：
1. 使用 GitHub Actions 定期运行 `update-data.js` 更新数据
2. 或者手动定期更新 `data.json`

## 环境变量

- `GITHUB_TOKEN`: GitHub API Token（可选，但推荐，可提高API限流）

## 会员系统

### 创始会员

首次使用时，需要手动创建创始会员账号。在浏览器控制台执行：

```javascript
const auth = new AuthSystem();
auth.users['创始人用户名'] = {
    username: '创始人用户名',
    password: auth.hashPassword('密码'),
    role: 'member',
    createdAt: new Date().toISOString(),
    favorites: []
};
auth.saveUsers();
```

### 邀请码机制

1. 已登录会员点击"邀请好友"按钮
2. 生成8位邀请码（30分钟内有效）
3. 被邀请人使用邀请码注册
4. 邀请码使用后失效

## 数据更新

### 手动更新

```bash
node update-data.js
```

### 自动更新（推荐）

使用 GitHub Actions 或服务器 cron 任务定期执行：

```bash
# 每天上午9点执行
0 9 * * * cd /path/to/biz-ideas-hub && node update-data.js
```

## 项目结构

```
biz-ideas-hub/
├── index.html          # 主页面
├── data.json           # 数据文件
├── update-data.js      # 数据更新脚本
├── js/
│   ├── auth.js         # 认证系统
│   └── app.js          # 主应用逻辑
├── api/
│   └── github.js       # GitHub API 接口
├── deploy/
│   ├── vercel.json     # Vercel 配置
│   └── netlify.toml    # Netlify 配置
└── README.md           # 本文件
```

## 注意事项

1. **安全性**: 当前版本使用 localStorage 存储用户数据，适合小范围使用。如需更高安全性，请接入后端服务。
2. **数据持久化**: 当前数据存储在 JSON 文件中，部署到无服务器平台时需要注意数据持久化问题。
3. **GitHub API 限制**: 未认证 60次/小时，认证后 5000次/小时。

## 后续优化方向

- [ ] 接入后端数据库（如 Supabase、Firebase）
- [ ] 接入 AI 服务生成商业点子
- [ ] 添加邮件通知功能
- [ ] 支持多语言
- [ ] 添加数据导出功能
