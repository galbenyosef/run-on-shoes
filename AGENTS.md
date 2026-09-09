# 项目维护约束

- 这是纯前端游戏。部署产物仅为 `dist/` 下的 HTML、CSS、JS 和本地模型；不引入服务器、SSR、账户凭据或托管平台运行时。
- 遵循 `build-project-architecture` 的职责边界，并以 TypeScript 适配其目录结构：根入口 → Demo → API → Module → Method / Dataset / Config。
- 根 `run_on_shoes.ts` 除 import 外只调用一次无参数 Demo 启动函数。Demo 通过 API 使用游戏能力，Module 类只暴露静态委托方法。Method 使用显式状态参数，Types 仅包含类型。
- 默认公共参数在 API，玩法及资源策略在 Config，模型加载/解码在 Dataset。不要让业务依赖反向引用上层；架构测试必须通过。
- 保持 `setup.sh` 与 `dev_setup.sh` 完全一致。共享安装及校验逻辑只能放在 `scripts/setup_common.sh`。不克隆 Git 依赖时不增加人为差异。
- 保留完整运行资产及来源说明。更新模型时必须同步 `docs/assets-manifest.json`，并说明哈希变化的原因。
- 资源路径必须同时支持站点根目录与 GitHub 项目子目录；不能把模型路径写死为 `/models/...`。
- 改动后执行 `npm run check` 和 `npm run lint`，更新 README 中相应能力及使用说明。
