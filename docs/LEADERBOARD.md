# 在线排行榜

游戏：https://565353780.github.io/run-on-shoes/

服务：https://microstride-leaderboard.fluffy-bud-2038.chatgpt.site

当前状态：功能与自动化测试已完成，服务尚未发布。Sites 源码接收端返回 HTTP 500，正在等待平台恢复或备用 Cloudflare 账号登录。原 GitHub Pages 游戏仍可游玩。

## 职责与持久化

用户选择“只填昵称即可提交”，授权为原纯静态游戏增加一个公开写入服务。游戏与模型仍由 GitHub Pages 托管；根 `.openai/hosting.json` 仅标识排行榜服务。`service-dist/` 与游戏 `dist/` 分开，服务发布不包含三维模型。

入口 `leaderboard_worker.ts` 只调用 Demo，依赖仍为 Demo → API → Module → Method / Dataset / Config。客户端与服务端分别拥有 `leaderboard_client`、`leaderboard_server` 能力；服务端运行于 Cloudflare Workers，不引入 SSR。

| 文件 | 契约 |
| --- | --- |
| `Method/leaderboard.ts` | 规范昵称、按成绩排序、计算前 10 名及任意玩家个人名次，无外部副作用 |
| `Method/leaderboard_client.ts` | 创建匿名身份、开始记录、提交与读取；身份令牌和昵称保留在浏览器，榜单持久化在服务端 |
| `Dataset/leaderboard_http.ts` | HTTP JSON 读写、超时、取消及响应解码；失败不返回假成功 |
| `Method/leaderboard_validation.ts` | 验证令牌、昵称、JSON 大小、UUID、成绩范围和服务端经过的时间 |
| `Method/leaderboard_server.ts` | 路由、CORS、限流与业务编排，返回明确 HTTP 错误 |
| `Dataset/leaderboard_store.ts` | D1 预备语句；批量事务提交一次性成绩并更新个人最好成绩，读取排名及分页公开导出 |
| `Demo/leaderboard_result.tsx` | 结算时读取榜单、提交状态、重试、卸载取消，不访问数据库 |
| `db/schema.ts` / `drizzle/` | Drizzle schema 与不可变迁移；运行时不创建或修改表 |
| `scripts/sync_leaderboard.ts` | 分页读取公开成绩，验证后生成 GitHub JSON 与安全转义的 Markdown |

`leaderboard_runs` 保存服务端开始时间与已接受的提交，30 天后清理；`leaderboard_scores` 长期保存每位玩家的最好成绩；`leaderboard_rates` 限流窗口过期后清理。玩家每局使用随机 UUID，浏览器拥有随机 256 位身份令牌，D1 只保存哈希。令牌不出现在榜单导出中，IP 仅用于限流哈希，不公开导出。

生存时间按 0.1 秒向下取整，距离按 0.001 游戏单位记录。服务接受最长 12 小时的一局，允许 15 秒网络计时误差；客户端必须在本局开始时联网登记。暂停不计入游戏成绩，但不会导致计时校验失败。同分先比较躲避次数，再比较距离；完全同分共享名次，次名跳号。

## HTTP 接口

- `GET /api/leaderboard`：返回 `{ top, personal, totalPlayers }`；无令牌时个人名次为空。
- `POST /api/runs`：`{ runId }`；同一玩家重复请求不重置开始时间。
- `POST /api/scores`：`{ runId, username, timeMs, dodged, distanceMm, ratio }`；一次提交不可变，重复请求返回当前排名。
- `GET /api/export?cursor=...`：公开字段分页导出，最多 500 条，供 GitHub 同步。
- `GET /health`：服务标识。

游戏的写入与个人排名请求携带 `X-Player-Token`，公开写入允许的 Origin 在 Config 中明确列出。CORS 不代替身份校验。支持 15 秒请求超时、重试和限流错误；不会将用户名直接拼入 SQL。

## 构建与发布

```sh
npm run check
npm run lint
npm run build:leaderboard
```

第一项完成类型、真实模型、分层、SQLite 与客户端集成、游戏生产构建及静态资源检查。服务构建使用 esbuild 输出 Cloudflare Worker 到 `service-dist/dist/server/index.js`，同时复制逻辑绑定与数据库迁移供 Sites 打包；它不会改动游戏 `dist/`。

使用 Sites 的 `package-site.sh service-dist ARCHIVE_PATH` 打包，源代码推送到该 Site 绑定的源仓库后，以相同提交 SHA 保存并公开发布版本。服务 URL、D1 绑定及来源已经写在仓库中，不需要浏览器持有任何运维凭据。所有 schema 修改都应生成并检查新的 Drizzle 迁移；已应用迁移不得改写。

Sites 发布源码可使用仅包含排行榜代码的独立 checkout，避免上传不参与服务构建的游戏模型。该 checkout 复用同一个 project_id，保留与本仓库一致的 Worker、Config、数据库迁移和测试，并独立保存源码 SHA；不得因此创建第二个 Sites 项目。

前端通过 `git push github main` 触发 Pages 部署。`.github/workflows/leaderboard.yml` 每 15 分钟及手动触发时读取服务，只有榜单内容变化时才提交 `leaderboard/` 文件。任务失败保留上一份镜像；游戏内仍读取实时榜单。GitHub 调度可能延迟，公开仓库长期无活动时定时任务可能停用。

成绩来自可修改的浏览器客户端。服务验证所有输入、身份所有权、经过时间和上限，并抑制重复与高频提交，但不声称能完全防作弊。昵称只是显示名；清除浏览器存储后无法找回原匿名身份。

参考：[D1 事务与预备语句](https://developers.cloudflare.com/d1/worker-api/d1-database/)、[GitHub 定时工作流规则](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)。
