# 架构与迁移说明

## 目标与约束

将归档任务「2图 - 鞋子跑酷游戏」的最后本地源码 `07af9d1878807da93d2bf2d983e892aff11975c4` 整理到本仓库，并重构为可以部署到 GitHub Pages 的纯静态前端。

保留完整真实鞋面碰撞、连续蒙皮动画、1:20–1:200 比例、2°/秒重力转向、双倍跳跃、激光/陨石、键盘/触控、暂停与可选 WebMCP。目标仓库原先只有默认 README，没有未提交的用户改动。

## 分层与技术适配

遵循 `~/github/skills/build-project-architecture/SKILL.md`。本游戏运行在浏览器中，使用 TypeScript 适配技能的 Python 目录范式；没有神经网络运行时，不建立空的 Model 目录。Types 是纯类型契约，不保存可变实例或运行逻辑。

依赖方向：`run_on_shoes.ts → Demo → API → Module → Method / Dataset / Config`。

| 目录                                     | 责任                                                          |
| ---------------------------------------- | ------------------------------------------------------------- |
| 根 `run_on_shoes.ts`                     | 除导入外仅一次无参数 `mountGame()` 调用                       |
| `Demo/bootstrap.tsx`                     | React 根节点挂载、StrictMode 和全局样式                       |
| `Demo/run_on_shoes.tsx`                  | 界面展示；只通过 API 创建与控制游戏；卸载时释放自己创建的实例 |
| `API/run_on_shoes.ts`                    | 公共参数默认值、异步创建入口和快照接口；延迟导入三维 Module   |
| `Module/run_on_shoes.ts` / `snapshot.ts` | 仅使用静态方法暴露并委托 Method 能力                          |
| `Config/game.ts` / `assets.ts`           | 不可变玩法政策与相对模型路径                                  |
| `Dataset/assets.ts`                      | 加载/解码资源，返回明确 glTF 契约，处理失败与取消             |
| `Method/`                                | 显式状态参数的可复用函数，无包含全部业务的类                  |
| `Types/`                                 | 状态、地形、重力与公共控制器的 type-only 契约                 |
| `Test/`                                  | 原子函数、真实模型、API、依赖分层、资源生命周期、静态发布测试 |

React 挂载、CSS、UI Slider 与通用 className 工具是浏览器框架适配层。场景使用 Three.js 官方对象保存状态；非神经 Module 类仍只包含静态委托方法。各层可以 type-only 引用 Types，运行时依赖没有循环，也不从底层引用 API 或 Demo。

## 原子能力与契约

| 文件 / 能力                                       | 输入 → 输出                                 | 副作用 / 失败行为                                         |
| ------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| `Method/scale.ts`: `ratioHeight`                  | 有限比例 → 世界空间身高                     | 超出 20–200 抛出 RangeError                               |
| `Method/physics.ts`: `jumpVelocity`               | 比例 → 起跳速度                             | 复用比例校验；保持最高高度加倍                            |
| `Method/gravity.ts`                               | 状态、步长、可注入随机数 → 重力状态/方向    | 原地更新向量；非正步长跳过                                |
| `Method/terrain.ts`                               | 网格、位置、位移 → 地形/交点/移动结果       | 建立 BVH；鞋外返回 null，无安全出生点抛错                 |
| `Method/collision.ts`: `hazardHits`               | 位置、半径、身高、灾害、跳高、up → boolean  | 无外部副作用；按当前重力判断距离                          |
| `Method/asset_paths.ts`                           | 站点基路径 → 两个模型 URL                   | 保持根目录和任意项目子目录兼容                            |
| `Dataset/assets.ts`: `loadAssets`                 | URL、AbortSignal、可注入 Loader → 两份 glTF | 任一失败释放成功项；取消后清理已完成和迟到资源            |
| `Method/assets.ts`: `loadGame`                    | 上下文 → Promise<void>                      | 归一化鞋子、地形索引和角色动画初始化；卸载后不更新界面    |
| `Method/resources.ts`: `disposeObject`            | Three.js 子树 → void                        | 去重释放几何、材质、纹理、骨架与 BVH                      |
| `Method/game.ts`: `createGame`                    | 容器、快照回调、完整选项 → GameController   | 创建场景、事件与动画循环；load 合并重复调用；dispose 幂等 |
| `Method/lifecycle.ts`                             | 上下文、命令参数 → void                     | 开始/暂停/全景/比例；无效模式命令跳过                     |
| `Method/movement.ts` / `hazards.ts` / `camera.ts` | 上下文、步长 → void                         | 各自推进角色、灾害、相机，沿用原游戏规则                  |
| `Method/frame.ts`                                 | 上下文、时间戳 → void                       | 编排重力、移动、灾害、相机、快照与渲染                    |

重力、地形和游戏都是显式状态数据，便于独立验证原子行为。业务函数之间以单向导入组合，避免在 Module 中复制业务逻辑。

## 静态部署

原版本的 Vinext、SSR、Cloudflare Worker、Wrangler、Sites 托管标识及未使用 UI 依赖均已移除。保留 React、Three.js、BVH、Slider 与实际使用的样式工具；沿用 npm 并更新锁文件。

后续用户明确授权“昵称即可提交”的在线排行榜，为此仅给排行榜增加独立 Sites Worker + D1。游戏静态产物和部署地址保持原方案；新的根 `.openai/hosting.json` 属于排行榜服务，详见 [LEADERBOARD.md](LEADERBOARD.md)。这项有运行职责的服务是对最初“无服务器”范围的明确扩展。

Vite 以 index.html 为入口，使用相对 `base: './'`；页面内导航和模型请求也使用相对路径，glTF 缓冲 URI 相对 glTF 自身解析。因此同一 dist 支持站点根、GitHub 项目路径及自定义域名。字体使用系统字体栈，无外部字体服务。

GitHub Actions 在 main 推送和手动触发时检查、构建、上传 dist 并部署 Pages。PR 只检查。公开仓库为 `565353780/run-on-shoes`，通过独立的 `github` 远端发布，保留原 GitLab origin。

## 安装政策

`setup.sh` 与 `dev_setup.sh` 字节一致，共同调用 `scripts/setup_common.sh`：检查 Node 最低版本、执行 npm ci，再执行 npm run check。两者接受相同 PATH/npm 环境配置，拒绝不支持的命令参数。无 Git 克隆依赖，因此没有 SSH/HTTPS 差别。

## 验证

- 原有真实鞋子测试验证归一化、出生点、四方向运动、边界、十种重力方向、鞋底与碰撞。
- API 测试验证静态委托、公共默认值、非法比例在创建 WebGL 前失败及独立快照。
- 资源测试验证失败、取消、迟到响应、共享资源去重释放和保留蒙皮动画。
- 架构测试检查单调用入口、Module 静态方法、Demo 仅经 API、无反向依赖和无循环。
- 7 个模型文件使用 SHA-256 清单验证与原项目一致。
- `test:static` 在没有 Vite 中间件、SSR 或 API 的普通 HTTP 服务器中，验证根路径和 `/run-on-shoes/` 下的页面、脚本、样式、模型以及所有缓冲。

```sh
bash -n setup.sh dev_setup.sh scripts/setup_common.sh
./setup.sh
./dev_setup.sh
npm run lint
```

`npm run check` 顺序执行 typecheck、test、build、test:static。开发与正式预览均只用于本机验证，静态托管无需运行 Node。
