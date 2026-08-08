# 🐾 ThawPaw Games | 游戏门户

**[中文](#中文) | [English](#english)**

---

## 中文

一个由 11 岁的苗苗（ThawPaw 🐱）和她的 AI 伙伴冰爪（IcePaw ❄️）共同打造的游戏网站。

### 🎮 游戏

| 游戏 | 描述 |
|------|------|
| [猫武士大冒险](https://games.thawflow.com/moonstone-quest.html) | Moonstone Quest — 收集月亮石，探索世界 |
| [Dungeon Explore](https://games.thawflow.com/dungeon.html) | 地牢探险，打怪升级 |
| [Snake Game](https://games.thawflow.com/snake.html) | 经典贪吃蛇，SkyClan 风格 |
| [少年剑客闯江湖](https://games.thawflow.com/sword-master.html) | Sword Master — 武侠动作闯关 |

### 🔗 链接

- 🌐 **在线游玩：** [games.thawflow.com](https://games.thawflow.com)
- 🛠️ **管理后台：** [games.thawflow.com/admin.html](https://games.thawflow.com/admin.html)

### 🏗️ 技术栈

- 纯前端 HTML / CSS / JavaScript（无框架）
- Cloudflare Workers + PostgREST KV 后端（云存档 / 多账号 / 好友系统）
- GitHub Pages 部署 + Cloudflare 自定义域名
- 百度站长 & sitemap 自动提交

### 📁 仓库说明

本仓库为**发布中转**，通过 `publish.sh` 自动从源码目录同步并推送。每次发布自动：

1. 运行预检测试（静态校验 + 服务测试）
2. 注入构建时间戳
3. 生成 `sitemap.xml`
4. 推送后自动提交百度收录

---

## English

A game portal built by ThawPaw 🐱 (an 11-year-old) and her AI companion IcePaw ❄️.

### 🎮 Games

| Game | Description |
|------|-------------|
| [Moonstone Quest](https://games.thawflow.com/moonstone-quest.html) | Collect moonstones, explore the world |
| [Dungeon Explore](https://games.thawflow.com/dungeon.html) | Dungeon crawler, fight monsters & level up |
| [Snake Game](https://games.thawflow.com/snake.html) | Classic snake with a SkyClan twist |
| [Sword Master](https://games.thawflow.com/sword-master.html) | Martial arts action adventure |

### 🔗 Links

- 🌐 **Play online:** [games.thawflow.com](https://games.thawflow.com)
- 🛠️ **Admin panel:** [games.thawflow.com/admin.html](https://games.thawflow.com/admin.html)

### 🏗️ Tech Stack

- Vanilla HTML / CSS / JavaScript (no frameworks)
- Cloudflare Workers + PostgREST KV backend (cloud saves / multi-account / friends)
- GitHub Pages hosting + Cloudflare custom domain
- Baidu webmaster & sitemap auto-submission

### 📁 About This Repo

This is the **publish mirror** — synced from the source directory via `publish.sh`. Each publish automatically:

1. Runs preflight tests (static + serve)
2. Injects build timestamp
3. Generates `sitemap.xml`
4. Submits URLs to Baidu after push

---

<p align="center">Made with 💙 by SkyClan</p>
