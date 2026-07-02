# 灵感引擎 v3 — Premium React 重构

## 技术栈
- **Vite 7 + React 19 + TypeScript** strict 模式
- **Tailwind CSS 3.4** + shadcn/ui 主题系统
- **shadcn/ui** 组件（Button, Card 等，40+ 预装）
- **Lucide Icons** 全套 SVG 图标（无 emoji）
- **静态导出** → 可直接部署 GitHub Pages / Vercel

## 设计系统
基于 ui-ux-pro-max 推荐: **Liquid Glass + Premium Dark + Gold Accent**

| 元素 | 浅色 | 暗色 |
|------|------|------|
| 背景 | #FAFAF9 | #06060F |
| 卡片 | 白底+毛玻璃 | 深黑+毛玻璃 |
| 强调色 | 青+紫渐变 | 荧光青+紫渐变 |
| 字体 | Inter | Inter |

## 组件结构
```
src/
├── components/
│   ├── Header.tsx        — 导航栏 + 主题切换 + 用户菜单
│   ├── StatsCards.tsx     — 4格数据统计
│   ├── TabsBar.tsx        — 分类标签
│   ├── SearchToolbar.tsx  — 搜索 + 排序 + 日期筛选
│   ├── ChipFilter.tsx     — 标签过滤
│   ├── Cards.tsx          — 商业点子卡 / GitHub 卡
│   ├── CardGrid.tsx       — 卡片网格 + 骨架屏
│   ├── DetailModal.tsx    — 详情弹窗
│   ├── AuthModal.tsx      — 登录/注册/邀请
│   └── Toast.tsx          — 消息提示
├── hooks/
│   ├── useData.ts        — 287条数据加载+筛选+排序
│   ├── useAuth.ts        — localStorage 认证（修复版）
│   └── useTheme.tsx      — 亮/暗/跟随系统
└── types/index.ts        — 完整 TypeScript 类型
```

## 构建产物
- JS: 261KB (gzip: 82KB)
- CSS: 94KB (gzip: 16KB)
- index.html: 0.4KB

## 相比 Qclaw 原版的改进
- ❌ 1个 524行 HTML → ✅ 17个模块化 TSX 组件
- ❌ emoji 图标 → ✅ Lucide SVG 图标
- ❌ 内联 CSS → ✅ Tailwind + shadcn 主题
- ❌ 无类型 → ✅ 完整 TypeScript strict
- ❌ 仅暗色 → ✅ 3模式主题切换
- ❌ 字符串拼接渲染 → ✅ React 组件化
- 287条历史数据完整保留
