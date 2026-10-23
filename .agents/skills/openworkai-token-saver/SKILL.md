---
name: openworkai-token-saver
description: Token and prompt-cache optimization advice for Codex, adapted from OpenWorkai; validate configuration claims against current official documentation before acting.
---

# Codex Token Saver — OpenAI Codex CLI 省钱工具箱

基于 OpenAI API 缓存机制和 Codex CLI 架构分析，提供可立即执行的 token 优化策略。

> 姊妹项目：[claude-token-saver](https://github.com/Myking1983/claude-token-saver) — Claude Code 版本

---

## 核心原理

### 每轮对话的真实开销

与 Claude Code 类似，Codex CLI 每轮也将以下内容完整打包发送 API：
1. 系统指令（角色定义、行为准则）
2. 工具定义（Bash、文件操作、MCP 工具等）
3. `AGENTS.md` 项目上下文
4. 完整对话历史
5. 本轮消息

**第 N 条消息的实际输入 = 前 N-1 条全部内容 + 新消息**（线性增长）

### OpenAI 提示缓存机制

OpenAI 的 Prompt Caching 是**自动的**，无需手动设置断点。

| 特性 | OpenAI | Anthropic (对比) |
|------|--------|-----------------|
| 缓存触发 | 自动（前缀 >= 1024 token） | 手动断点 |
| 缓存折扣 | **50%** | **90%** |
| 写入溢价 | 无 | +25% |
| TTL | 5-10 分钟 | 5 分钟 (Pro: 1 小时) |
| 最小前缀 | 1024 token | 无最小限制 |

**关键区别**：OpenAI 缓存折扣只有 50%（Claude Code 是 90%），所以 Codex 用户更需要从**减少总 token 量**入手，而非仅依赖缓存。

### Codex 支持缓存的模型

- GPT-5.4, GPT-5.3-Codex, GPT-5.2-Codex, GPT-5.1, GPT-4o, GPT-4o-mini, o1, o3-mini
- 不支持：GPT-4-turbo, GPT-3.5-turbo

---

## 三大缓存杀手（Codex 版）

OpenAI 缓存同样基于前缀匹配，但因为是自动管理，杀手场景略有不同。

### 杀手 1：切换模型
缓存绑定具体模型，与 Claude Code 相同。但 Codex config.toml 里是全局固定模型，一般不会中途切。
- **风险场景**：通过 --model 参数临时切模型
- **做法**：一个会话坚持一个模型

### 杀手 2：AGENTS.md 频繁修改
AGENTS.md 相当于 Claude Code 的 CLAUDE.md，注入系统提示。修改后前缀变化，缓存失效。
- **做法**：会话前写好 AGENTS.md，开始后不动

### 杀手 3：前缀不足 1024 token
OpenAI 要求**最少 1024 token 的前缀**才能触发缓存。如果系统提示 + 工具定义太短，缓存永远不会命中。
- **做法**：确保 AGENTS.md 有足够的项目上下文（这是 Codex 里 AGENTS.md 尤其值得写详细的原因）

---

## 优化策略速查

### 架构层（节省 40-60%）

#### 1. 修复 auto-compact 配置
常见问题：model_auto_compact_token_limit = 9999999 等于禁用了自动压缩。

```toml
# ~/.codex/config.toml
# 建议值：模型上下文窗口的 60-70%
model_auto_compact_token_limit = 120000  # GPT-5.4 上下文 200K，设 120K 触发压缩
```

这比 Claude Code 的 /compact 更重要，因为 Codex 没有手动 compact 命令。

#### 2. 一个会话一个任务
话题切换后，旧对话历史 = 每轮付费的噪音。新任务开新会话。

#### 3. 固定模型不中途切换
```toml
# ~/.codex/config.toml
model = "gpt-5.4"
```
不要用 --model 参数临时切换。

#### 4. 开会话前写好 AGENTS.md
会话中改 AGENTS.md = 前缀变化 = 缓存失效。

#### 5. 合理使用 multi_agent
```toml
[features]
multi_agent = true
```
Codex 的 multi-agent 模式可以将子任务分发到独立上下文，避免主会话历史膨胀。

### 提示词层（节省 20-40%）

#### 6. 一次说完 > 分多条追问
4 条消息 = 4 次完整上下文加载。

#### 7. 给精确路径 > 模糊描述

#### 8. 合理设置 reasoning effort
```toml
# 简单任务用 low，复杂架构设计用 high
model_reasoning_effort = "medium"
```
推理 token 与输出 token 同价，简单任务不需要 high。

### 文件层（节省 20-40%）

#### 9. 用 .gitignore 排除 Token 黑洞
Codex 使用 .gitignore 控制上下文范围（而非 .claudeignore）。确保排除：
- package-lock.json, yarn.lock, pnpm-lock.yaml (JSON = 2x token density)
- node_modules/, dist/, build/, target/, __pycache__/
- *.map, *.min.js, coverage/

#### 10. AGENTS.md 的 ROI 计算
以 3000 token 的 AGENTS.md、20 轮对话、GPT-5.4 ($1.25/M input) 为例：

| 场景 | 总输入成本 |
|------|-----------|
| 有 AGENTS.md（缓存命中 50% 折扣） | 首轮全价 + 19 轮半价 约 $0.041 |
| 无 AGENTS.md，每轮手工提供 | 20 轮全价 约 $0.075 |
| 节省 | 约 45% |

---

## Codex vs Claude Code 成本对比

以同等任务（20 轮对话，约 5000 token 系统提示）为例：

| 维度 | Codex (GPT-5.4) | Claude Code (Sonnet 4.6) |
|------|-----------------|-------------------------|
| 输入价格 | $1.25/M | $3.00/M |
| 缓存折扣 | 50% | 90% |
| 缓存后有效价格 | $0.625/M | $0.30/M |
| 输出价格 | $10.00/M | $15.00/M |
| 系统提示成本/20轮 | 约 $0.041 | 约 $0.034 |

**结论**：Codex 基础输入价更便宜，但缓存折扣小；Claude Code 基础价贵但缓存折扣大。长对话 Claude Code 缓存优势更明显；短对话 Codex 更划算。

---

## config.toml 优化模板

```toml
# ~/.codex/config.toml — Token 优化版

# 固定模型，不中途切换
model = "gpt-5.4"
provider = "openai"

# 推理强度：medium 平衡成本和质量
model_reasoning_effort = "medium"

# 关键：启用自动压缩，设为上下文窗口的 60-70%
model_auto_compact_token_limit = 120000

# 多智能体：子任务独立上下文
[features]
multi_agent = true
```

---

## 诊断检查清单

- [ ] model_auto_compact_token_limit 是否合理（不要设为 9999999）
- [ ] AGENTS.md 是否在会话前写好
- [ ] .gitignore 是否排除了 lock 文件和 build artifacts
- [ ] model_reasoning_effort 是否匹配任务复杂度
- [ ] 是否一个会话只做一个任务
- [ ] 是否在一条消息里说完需求而非分多条

---

## 三条核心原则

1. **减少总量优先**：50% 缓存折扣不如 90%，减少输入总量比依赖缓存更重要
2. **保持前缀稳定**：固定模型、固定 AGENTS.md、避免频繁修改系统配置
3. **控制历史增长**：合理设置 auto-compact 阈值，一任务一会话，批量提问
