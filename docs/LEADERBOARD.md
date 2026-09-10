# 在线排行榜

游戏：https://565353780.github.io/run-on-shoes/

服务：https://aperture-flight-leaderboard.fluffy-bud-2038.chatgpt.site/microstride/

排行榜复用雕塑飞行游戏的在线服务。鞋子游戏使用独立接口命名空间和三张数据表，两个游戏的成绩及排名互不混合。

## 职责与持久化

用户选择“只填昵称即可提交”，授权为原纯静态游戏增加一个公开写入服务。游戏与模型仍由 GitHub Pages 托管；排行榜的部署配置保存在共享服务 checkout 中。`service-dist/` 是可独立运行的参考 Worker 产物，与游戏 `dist/` 分开。

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

以上路径均相对于服务地址 `/microstride/`。游戏的写入与个人排名请求携带 `X-Player-Token`，公开写入允许的 Origin 在 Config 中明确列出。CORS 不代替身份校验。支持 15 秒请求超时、重试和限流错误；不会将用户名直接拼入 SQL。

## 构建与发布

```sh
npm run check
npm run lint
npm run build:leaderboard
```

第一项完成类型、真实模型、分层、SQLite 与客户端集成、游戏生产构建及静态资源检查。`build:leaderboard` 输出独立 Worker 作为参考产物；不要直接用它覆盖共享服务，否则会移除飞行游戏接口。

正式部署使用现有共享服务项目 `appgprj_6aa17e85770481919de166e32e0e9db1`，服务 checkout 为 `~/github/fly-around-sculpture-leaderboard`：

```sh
node scripts/prepare_shared_leaderboard.mjs ~/github/fly-around-sculpture-leaderboard
```

该脚本同步鞋子模块、框架路由和 schema，并保留原有飞行模块。在共享服务目录运行 `npm run db:generate`，检查迁移只新增鞋子相关表；随后执行类型检查、`npm test` 和 `npm run build`。两款游戏的全部测试都应通过。最后用 Sites 标准流程保存并公开发布该共享服务。更新任一游戏前应读取服务最新代码，保留两套接口和所有已应用迁移。

首次合并使用新增迁移 `0001_dashing_doctor_octopus.sql`，原飞行游戏的 `0000` 迁移未变。框架路由只注入宿主的 DB 绑定并调用 Demo；游戏业务仍在既有分层中。服务 URL 和 CORS 来源均为公开配置，浏览器不持有运维凭据。

早期未发布的独立 Sites 项目 `appgprj_6aa213c807b88191a9b1135d342ef21a` 因源码接收端 HTTP 500 弃用；不要为此重复创建项目。

前端通过 `git push github main` 触发 Pages 部署。`.github/workflows/leaderboard.yml` 每 15 分钟及手动触发时读取服务，只有榜单内容变化时才提交 `leaderboard/` 文件。任务失败保留上一份镜像；游戏内仍读取实时榜单。GitHub 调度可能延迟，公开仓库长期无活动时定时任务可能停用。

成绩来自可修改的浏览器客户端。服务验证所有输入、身份所有权、经过时间和上限，并抑制重复与高频提交，但不声称能完全防作弊。昵称只是显示名；清除浏览器存储后无法找回原匿名身份。

参考：[D1 事务与预备语句](https://developers.cloudflare.com/d1/worker-api/d1-database/)、[GitHub 定时工作流规则](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)。
