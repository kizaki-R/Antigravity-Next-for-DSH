# Antigravity Next for DSH

<p align="center">
  <img src="./assets/banner-zh-CN.png" alt="Antigravity Next for DSH 横幅" width="100%" />
</p>

[![CI](https://github.com/kizaki-R/Antigravity-Next-for-DSH/actions/workflows/ci.yml/badge.svg)](https://github.com/kizaki-R/Antigravity-Next-for-DSH/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DSH-%3E%3D0.1.5--rc.1%20%3C0.3.0-orange.svg)](https://deepseek.com/harness/)

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

非官方的 [DeepSeek Harness](https://deepseek.com/harness/)（DSH）模型提供商插件。将本地安装的官方 Google Antigravity / Cloud Code Assist 模型集成至 DSH 的 Agent 核心循环中，提供商标识为 `agy-next`。

> **免责声明：** 本项目为非官方本地集成，与 Google 或 DeepSeek 均无任何隶属、认可或官方支持关系。使用前请确保拥有合法 Google 账号授权，且本机已安装官方 Antigravity 应用程序。

---

## 功能特性

- **免手动配置 GCP**：直接从本机安装的官方 Antigravity 解析 OAuth client，无需在 Google Cloud Console 创建项目或密钥。
- **多账号轮换池**：可添加多个 Google 账号并配置安全阈值；当前账号额度耗尽时，自动切换至备用账号继续对话。
- **实时额度监控面板**：设置页展示 Gemini、Claude 与 Gemini 4 Argon 的每周及 5 小时额度条与重置倒计时。
- **思考强度档位调节**：支持推理思考强度调节（Low、Medium、High，适用于 Gemini 4 Argon、Gemini 3.8 Flash 与 Claude 系列）。
- **本地安全存储**：客户端探索仅读取文件，不启动官方应用。Token 仅保存在本地 `<DSH_HOME>/storages/agy-next-oauth.json`，不上载私钥。

---

## 环境要求

1. **DeepSeek Harness：** 版本 `>=0.1.5-rc.1 <0.3.0`，Node.js 运行时 `>=20`。
2. **官方 Antigravity 桌面端：** 安装于本机 Windows 或 macOS 系统（Linux 适配进行中）。请从[官方渠道](https://antigravity.google/product/antigravity-2)下载。*运行时无需保持该应用程序处于开启状态。*
3. **Google 账号：** 支持浏览器 OAuth 授权且具备访问 Gemini / Cloud Code Assist 服务的权限。

---

## 安装说明

### 方式一：DSH 界面安装（推荐）

1. 打开 DSH 侧边栏的 **“插件” → “+ 添加插件”**。
2. 在输入框输入 GitHub 仓库地址：
   ```text
   https://github.com/kizaki-R/Antigravity-Next-for-DSH
   ```
   *（npm 发布后，亦可直接输入包名 `agy-next`）。*
3. 点击 **“安装”**，完成后重启 DSH。

### 方式二：本地开发模式（CLI / Link）

从本地源码调试：

```bash
# 在 DSH profile 中注册本地链接
dsh plugin --profile <profile> add link:/absolute/path/to/agy-next
```

确保该 profile 的 `dsh.profile.bundles` 中包含 `agy-next`，随后重启 DSH。

---

## 快速使用

### 1. 登录账号

在 DSH 中进入 **“设置” → “AGY-Next”**：

1. **检查状态**：确认页面识别到本地 Antigravity 安装路径。
2. **添加账号**：点击 **“登录 / 添加账号”**，系统将调用浏览器打开 Google 官方授权页。
3. 授权成功后账号即进入账号池，并实时展示各模型额度。

*CLI 备用命令：*

```bash
npm run login              # 登录新账号
npm run login -- --status  # 查看当前活动账号与额度
npm run login -- --force   # 强制重新认证
npm run login -- --logout  # 清除已保存凭据
```

### 2. 自定义安装路径

若 Antigravity 安装在非标准目录，在启动 DSH 前配置环境变量即可：

```powershell
# PowerShell
$env:AGY_NEXT_INSTALL_PATH = 'C:\Custom\Path\To\Antigravity'
```

---

## 进阶配置

如需调整参数，可编辑 profile 目录下的 `cordis.yml`：

```yaml
- id: agy-next
  name: agy-next
  config:
    credentialPath: ""               # 默认为 <DSH_HOME>/storages/agy-next-oauth.json
    streamIdleTimeoutMs: 300000      # 5 分钟空闲流保护超时
    discoveryTimeoutMs: 8000         # 本地二进制客户端探测超时
    projectCacheTtlMs: 1800000       # 项目元数据缓存生存期（30 分钟）
    runtimeModel: ""                 # 可选：固定指定后端模型 ID
```

---

## 支持模型列表

| 模型系列 | 代表型号 | 上下文长度 | 特性支持 |
|---|---|---|---|
| **Gemini 4 Argon** | `gemini-4-argon` | 1M tokens | Low / Medium / High 思考档位，5 小时与每周额度独立统计 |
| **Gemini 3 / 2.5** | `gemini-3.8-flash`、`gemini-3-flash`、`gemini-2.5-pro`、`gemini-2.5-flash` | 1M tokens | 高速多模态流式交互，工具调用 |
| **Claude 系列** | `claude-sonnet-5-5`、`claude-opus-5-5`、`claude-opus-4-6`、`claude-sonnet-4-6` | 1M tokens | 深度集成 Cloud Code Assist 的 Claude 运行时 |
| **开源模型** | `gpt-oss-120b` | 128k tokens | 大参数开源权重推理 |

---

## 开发与测试

在 `agy-next/` 目录下运行完整离线测试集：

```bash
npm run check        # 检查全量 40 个源码模块的语法
npm test             # 离线回归测试集（21 个用例）
npm run test:peers   # 严格主控 peers 契约测试（不允许跳过）
```

进行 peers 契约测试前配置主控依赖路径：

```powershell
$env:AGY_PEER_ROOT = 'C:\path\to\dsh\node_modules'
npm run test:peers
```

---

## 安全机制

- **不内置密钥**：代码库不包含任何 Google Client ID 或 Client Secret，全部由本地应用资源动态解析。
- **存储隔离**：凭据保存在 DSH 专属的 `agy-next-oauth.json` 中，不读取或修改官方应用的本地数据库。
- **墓碑机制（Tombstone）**：登出所有账号时写入标有 `loggedOut: true` 的空文件，彻底杜绝历史配置自动复活旧账号。

---

## 开源协议

本项目基于 [MIT](LICENSE) 协议开源 © [Kizaki](https://github.com/kizaki-R)
