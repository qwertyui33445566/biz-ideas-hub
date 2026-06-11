# Biz-Ideas-Hub Bug 修复经验总结

> 整理自 2026-06-01 ~ 2026-06-11 开发过程中踩过的坑。
> **目标：后续项目不再重复犯错。**

---

## 一、环境与网络类

### 1. ⚡ PowerShell 反引号转义陷阱
**问题：** 用 PowerShell 写含 JS 模板字符串（反引号 `` ` ``）的文件时，PowerShell 把反引号当转义符吞掉，导致生成的 JS 语法损坏。
**代价：** app.js 重写两次，浪费 30 分钟。
**教训：**
- ❌ 不要用 `echo "..." > file.js` 或 PowerShell 字符串直接写 JS/Python 代码
- ✅ **用 Node.js 写文件**（`fs.writeFileSync`）或用 `write` 工具
- ✅ 或先写 `_tmp.js` 再用脚本移过去

### 2. 🌐 GitHub 网络封锁 + hosts 劫持
**问题：** 服务器 GitHub 443 被封，hosts 文件被加速器改为 `127.0.0.1`。DNS 解析正确但连接不通。
**代价：** debug 2 小时，尝试 curl/ping/nslookup/Test-NetConnection 各种手段。
**教训：**
- `Test-NetConnection TCP SYN` 成功 ≠ HTTPS 能通（可能是中间设备假响应）
- 加速器（Watt Toolkit）会改 hosts 文件，**这是正常行为**，不要试图"修复"
- 有加速器时用 `git config --global http.sslverify=false` 绕过 MITM 证书问题
- git push 走 HTTPS + token URL 比 SSH 更靠谱（22 端口也封）

### 3. 🔒 SSL 证书验证
**问题：** Node.js 的 `https.get` 请求 GitHub API 报 `unable to verify the first certificate`。
**代价：** 首次同步 28/60 全失败。
**教训：**
- Node.js 请求加 `rejectUnauthorized: false`（开发环境可接受）
- 或设置 `NODE_TLS_REJECT_UNAUTHORIZED=0`
- **只在直连环境可用**，加速器 MITM 下证书也是被替换的

### 4. 🔄 GitHub API 301 重定向
**问题：** GitHub API 对部分仓库返回 301（如仓库改名），Node.js `https.get` 默认不跟随。
**代价：** 31 个仓库同步失败。
**教训：** 用 `followRedirects: true` 或手动处理 301 Location header。

---

## 二、前后端 ID/元素不匹配类（最高频！）

### 5. 🏷️ HTML 元素 ID 与 JS 引用不一致
**问题：** 重构 UI 时 HTML 里改了元素 ID，但 JS 里还在用旧的 ID，导致 `getElementById` 返回 null，事件绑定失败。
**案例：**
- `cards-grid` vs `content-grid`（容器 ID 不匹配）
- `login-section` 不存在（HTML 用的是 `auth-modal`）
- `generate-invite-btn` 名字不对

**代价：** 至少 3 次 commit 专门修 ID。每次都要 node --check 才发现。
**教训：**
- ✅ **改 HTML 时，同步搜索 JS 中所有引用该 ID 的地方**
- ✅ 提交前用 `node --check app.js` 验证语法
- ✅ 在 JS 初始化时加 `console.warn` 对 null 元素做防御性检查

### 6. 📝 缺失 HTML 元素
**问题：** JS 引用了 `login-error`、`register-error` 元素，但 HTML 里根本没写。
**代价：** 报错但不崩溃，用户看到空白。
**教训：**
- 先写 HTML 骨架 → 再写 JS 逻辑（或对照检查）
- 提交前在浏览器 DevTools Console 跑一遍，看有没有 null 引用

---

## 三、逻辑类

### 7. 🔐 邀请制逻辑反转
**问题：** 最初实现任何人都能用预设码注册，完全没有限制效果。
**代价：** 架构重写 auth.js。
**教训：**
- 写鉴权逻辑时，先画流程图：**谁能做什么？**
- 邀请制 = 仅会员可生成码 + 码有时效 + 一次性

### 8. 🔤 btoa() 不支持中文
**问题：** 用 `btoa()` 生成 JWT 时，用户名含中文导致 `Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range`。
**代价：** 注册功能完全不可用。
**教训：**
- ✅ **永远不要对非 ASCII 字符直接用 btoa()**
- ✅ 用 `btoa(unescape(encodeURIComponent(str)))` 或 `Buffer.from(str, 'utf-8').toString('base64')`

### 9. 👁️ 收藏按钮 UI 设计
**问题：** 初始设计收藏按钮小图标，用户反馈"看不到"、"不明显"。
**代价：** 改了 3 轮（小图标 → 大图标 → 底部大按钮）。
**教训：**
- 收藏/点赞是**核心操作**，按钮要足够醒目
- 移动端友好的设计：按钮至少 44px 触摸区域
- 不要把核心操作藏在卡片角落

---

## 四、数据类

### 10. 📦 data.json 格式损坏
**问题：** 手动拼接 JSON 时漏了逗号或括号，导致解析失败，网站一直加载中。
**代价：** 以为网络问题，debug 半天。
**教训：**
- ✅ **用 `node -e "require('./data.json')"` 验证 JSON 有效性**
- ✅ 生成 JSON 用 `JSON.stringify` 而不是字符串拼接
- ✅ 数据文件修改后立刻验证

### 11. 🔃 同步脚本数据管道断裂
**问题：** 商业点子每日生成写入 `business-ideas.md`，GitHub 数据存入 `github-trending-pushed.json`，但都没有自动合并到 `data.json`。
**代价：** 网站断更 10 天才被发现。
**教训：**
- ✅ **任何数据管道都要有"消费者"** —— 产出不等于交付
- ✅ 搭建 pipeline 时，上下游要串起来验证
- ✅ cron 任务产出 → 合并脚本 → git commit → push → 全链路测试

---

## 五、Git 与部署类

### 12. 🚫 GitHub Token 泄露到工作流文件
**问题：** Token 写入 `.github/workflows/daily-update.yml` 被秘密扫描拦截，push 失败。
**代价：** 清理文件、force push。
**教训：**
- ✅ Token 只放 git remote URL 或 GitHub Secrets，**绝不能进代码仓库**
- ✅ `.github/workflows/` 要用 `${{ secrets.GITHUB_TOKEN }}` 而非明文

### 13. 📁 file:// 协议跨域限制
**问题：** 本地打开 HTML，`fetch('data.json')` 因 CORS 被浏览器拦截。
**代价：** 以为代码 bug，实际是协议限制。
**教训：**
- ✅ 开发时用本地 HTTP 服务器（`npx serve` 或 VS Code Live Server）
- ✅ 不要双击 HTML 直接用 `file://` 打开测试

---

## 六、通用开发纪律

| 规则 | 说明 |
|------|------|
| 🧪 **提交前验证** | `node --check` 检查 JS 语法，JSON 用 `require()` 验证 |
| 🔄 **小步提交** | 一个功能一个 commit，不要攒一堆一起推 |
| 📋 **ID 命名约定** | HTML 和 JS 共用 ID 常量，集中管理 |
| 🛡️ **防御性编程** | `getElementById` 返回值做 null 检查 |
| 📝 **每次修完记录** | bug 原因 + 修复方法写入 lessons-learned |
| 🏗️ **先骨架后细节** | HTML 结构 → JS 逻辑 → 样式美化，顺序不能乱 |

---

## 后续检查清单（每次开发前过一遍）

- [ ] JSON 文件修改后用 `node -e "require('./file')"` 验证
- [ ] JS 文件修改后用 `node --check file.js` 验证
- [ ] HTML/JS 元素 ID 是否一一对应
- [ ] 敏感信息（Token/密码）是否在代码文件中
- [ ] 数据管道：产出 → 消费是否串通
- [ ] 提交信息是否清晰描述改动
