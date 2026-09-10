# Run on Shoes · 微步 MICROSTRIDE

在巨型鞋子表面奔跑、跳跃和冲刺，躲避天空中的激光与陨石。由两张参考图生成的鞋子和角色模型构成真实三维关卡。

在线游玩：[微步 MICROSTRIDE](https://565353780.github.io/run-on-shoes/) · 公开源码：[565353780/run-on-shoes](https://github.com/565353780/run-on-shoes)。

这是 **React + TypeScript + Three.js 的纯前端游戏**。Vite 构建输出到 `dist/`，可直接部署到 GitHub Pages 或其他静态 HTTP 托管。游戏无需 Node 服务、Hi3D API、密钥或外部模型 CDN。用户授权增加的在线排行榜单独使用 Sites Worker + D1 保存成绩；服务不可用时仍可正常游玩。

## 本地运行

需要 Node.js 22.13+ 和 npm。

```sh
./setup.sh
npm run dev
```

`setup.sh` 安装锁定依赖并运行类型检查、测试、生产构建、静态资源验证。`dev_setup.sh` 执行完全相同的流程。两者共同使用 `scripts/setup_common.sh`，均通过 `PATH` 选择 Node/npm，并沿用相同的 npm 环境配置。

已安装依赖时可直接执行：

```sh
npm run dev       # 开发服务器，地址以终端输出为准
npm run check     # 类型检查、测试、构建、静态 HTTP 检查
npm run lint
npm run preview   # 预览 dist/ 中的生产版本
```

通过 HTTP(S) 打开游戏，不能直接双击 `index.html` 使用 file:// 加载模块和 glTF。游戏的 `dist/` 产物只有静态文件；排行榜服务独立构建到 `service-dist/`。

## GitHub Pages

1. 将该仓库内容推送到自己的 GitHub 仓库，使用 `main` 分支。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送 `main` 或手动运行 **Deploy game to GitHub Pages** 工作流。检查通过后，它会发布 `dist/`；页面地址见工作流的部署结果。

仓库已提供 [Pages 工作流](.github/workflows/pages.yml)。Pull Request 只进行构建和检查，不部署。本地保留原 GitLab `origin`，新增 `github` 远端用于发布到 `565353780/run-on-shoes`。后续运行 `git push github main` 即可触发更新。

Vite 使用 `base: './'`，模型也按页面路径加载。同一份产物支持 `https://用户名.github.io/仓库名/`、站点根目录和自定义域名，不要求仓库一定叫 `run-on-shoes`。网页内返回首页的链接也使用相对路径。配置依据：[Vite 静态部署](https://vite.dev/guide/static-deploy.html)及[相对 base](https://vite.dev/guide/build.html#relative-base)。

如使用其他静态托管，只需上传 `npm run build` 生成的整个 `dist/` 目录。

## 用户排行榜

- 游戏结束后弹出填写用户名的结算窗口，可提交成绩或跳过。
- 提交后立即显示前 10 名和自己的名次，即使本人不在前 10 名也会单独显示。
- 同一匿名玩家保留最好成绩；按生存时长、躲避次数、移动距离依次排序，完全同分并列。角色比例随成绩记录。
- 玩家身份令牌只保存在当前浏览器，服务端仅保存其 SHA-256 标识。昵称可重名；更换电脑、浏览器或清除站点存储会成为新玩家。
- [GitHub 排行榜](leaderboard/README.md)及[完整公开数据](leaderboard/scores.json)由 Actions 每 15 分钟尝试同步。游戏内榜单实时读取服务；GitHub 调度繁忙时可能延迟，公开仓库无活动 60 天后需重新启用定时工作流。
- 成绩需通过本局开始记录、计时与数值范围校验；重试不会重复上榜。浏览器成绩适用于休闲排行，不是权威反作弊系统。

排行榜服务地址与发布、数据库迁移、接口说明见 [LEADERBOARD.md](docs/LEADERBOARD.md)。前端没有仓库写入令牌，GitHub 同步工作流仅使用自身 `GITHUB_TOKEN`。

## 玩法

- 开场展示整只鞋，可拖动旋转和滚轮缩放。
- 角色身高与鞋长默认 1:100，可在 1:20–1:200 之间调整。
- WASD / 方向键：相对镜头移动；空格：跳跃；Shift：冲刺。
- 拖动调整镜头，滚轮调整距离；Esc 暂停/继续，页面失焦自动暂停。
- 红圈预警激光，需要移出攻击区域；橙圈预警陨石，可以跳过冲击波。
- 鞋子保持固定，重力与相机以 2°/秒平滑转向，鞋侧和鞋底逐渐成为可落脚区域。
- 保留最后一次本地修改：跳跃最高高度为初版的 2 倍，激光在最高点仍有正确判定。
- 窄屏提供触控方向键、跳跃和冲刺按钮。
- 右下角在加载、全景、游戏、暂停和结束画面始终显示 `Powered by GPT6 and Hi3D`。

## 目录与接口

```text
run-on-shoes/
├── index.html / run_on_shoes.ts   # 静态页面与单次 Demo 调用
├── setup.sh / dev_setup.sh
├── scripts/setup_common.sh
├── run_on_shoes/
│   ├── Demo/                    # React 界面与挂载
│   ├── API/                     # 公共接口、调用默认值
│   ├── Module/                  # 静态能力委托
│   ├── Config/                  # 不可变玩法参数与资源路径
│   ├── Dataset/                 # glTF 加载、解码及失败清理
│   ├── Method/                  # 地形、重力、移动、灾害等独立函数
│   ├── Types/                   # 纯类型契约
│   └── Test/                    # 真实模型、接口、分层、资源回归
├── app/globals.css
├── components/ui/slider.tsx
├── public/models/               # 完整运行模型
└── .github/workflows/pages.yml
```

按 `build-project-architecture` 分层，使用 TypeScript 适配浏览器项目，未引入无运行职责的 Python 或神经网络目录。完整职责、原子函数契约和迁移说明见 [ARCHITECTURE.md](docs/ARCHITECTURE.md)。

```ts
import { createGame } from './run_on_shoes/API/run_on_shoes.ts';

const game = await createGame(
  container,
  (snapshot) => {
    // 将 snapshot 展示到自己的界面。
  },
  { ratio: 100, baseUrl: './' },
);
await game.load();
game.start();
// 页面卸载时调用；重复调用安全。
game.dispose();
```

三维运行代码延迟加载；控制器暴露加载、开始、全景、暂停、比例、声音、输入、跳跃、冲刺、快照与释放。没有任何导入即创建 WebGL 的副作用。

## 模型与来源

鞋子约 498 万三角面，两张 8192×8192 纹理；保留 Meshopt 压缩后的真实几何与原始纹理字节。角色约 5 万面，保留蒙皮和 Idle、Run、Jump 动画。首次加载模型总量约 46 MB，保持原有模型精度。

模型全部随仓库提供，不需要再次调用生成服务。7 个运行模型文件逐一与原项目校验 SHA-256 一致，记录在 [资源清单](docs/assets-manifest.json)。生成阶段的原始 GLB 和可编辑 Blender 工程仍在原归档任务的交付目录，不属于网页运行依赖。

来源：归档任务「2图 - 鞋子跑酷游戏」，原源码提交 `07af9d1878807da93d2bf2d983e892aff11975c4`。跑步动画适配自 Quaternius CC0 动画库；详细来源见 [ASSET_CREDITS.md](ASSET_CREDITS.md)。
