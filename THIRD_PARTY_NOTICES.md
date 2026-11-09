# 求解器与对应源码

本地翻后引擎使用 Wataru Inariba 的 b-inary/postflop-solver，提交 9d1509fe5077d019825f833eed04b16d342dfda1，许可证 AGPL-3.0-or-later。

随目录版提供 `resources/source` 中的应用与引擎对应构建源码、Cargo.lock、构建说明及求解器许可证。引擎本体没有修改；在较新Rust编译器下使用 `-A dangerous_implicit_autorefs` 兼容参数。新增的trainer_engine适配器在 `research/solver-probe/src/bin/trainer_engine.rs`。

运行时通过本机标准输入输出读取已求解的有限动作树，不调用远程服务，不上传牌局，不保存练习记录。求解策略文件是随包只读训练资料，不是用户数据库。

React、React DOM、Vite和Phosphor图标使用其各自发行包的许可证。应用对应package-lock.json随源码提供。此包不包含订阅求解服务的数据。
