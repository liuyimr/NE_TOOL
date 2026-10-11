<p align="center">
  <img src="assets/newe-logo.png" alt="新易科技工作室 NewE" width="340">
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/version-1.0.0-informational" alt="version 1.0.0">
  <img src="https://img.shields.io/badge/PWA-offline--ready-success" alt="PWA offline ready">
  <img src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white" alt="Vite 5">
</p>

# 工程师工具箱 · Engineer Toolbox

给网络工程师、建筑智能化（弱电）工程师和工业自动化工程师用的工具箱。43 个常用计算和速查放在一个页面应用里，打开就算，算完就走。

机房、弱电间、地下室、工地经常没信号，所以它做成纯前端加 PWA：第一次打开之后断网也能用，手机上"添加到主屏"就跟装了个 App 一样。不注册、不登录、不上传数据，所有计算都在你自己的浏览器里跑完。

默认深色界面，可以切浅色。中文界面。

## 你可能在找

子网计算器 / CIDR 网段划分 · T568A T568B 线序 · RJ45 引脚定义 · 常用端口号（502、102、44818、4840）· 2.4G 5G 无线信道 · 监控摄像头存储容量 · 硬盘配置 · 中央空调时间型计费 · FCU 分摊 · 4-20mA 转工程量 · 0-10V 换算 · PT100 温度换算 · 热电偶 mV · Modbus 功能码 · Modbus 异常码 · 三相电机电流 · 电机扭矩 · 电缆电压降 · 导线载流量 · 分压电阻 · 限流电阻 · IEEE754 浮点转换 · BCD 转换 · 照度计算 · 灯具数量 · 桥架填充率 · UPS 容量 · 综合布线线缆长度

## 有哪些工具

一共 43 个，按三个领域分开。

### A. 网络工程（13 个）

| 编号 | 工具 | 说明 |
|---|---|---|
| A1 | IP 子网计算器 | 输入 IP 与掩码或 CIDR，得到网络地址、广播地址、可用主机范围与数量、地址类别、公私网判断 |
| A2 | IP 地址转换与校验 | 十进制、二进制、十六进制互转，格式合法性校验 |
| A3 | 进制转换器 | 二、八、十、十六进制互转，支持指定位宽与大数 |
| A4 | 带宽 / 流量单位换算 | bps 与 B/s 全系换算，Mbps 和 MB/s 不再弄混 |
| A5 | 传输时间估算 | 按数据量和带宽算传输时间，可计入协议开销 |
| A6 | 网线线序速查 T568A/T568B | 8 芯色标顺序，直通线与交叉线做法 |
| A7 | RJ45 引脚定义速查 | 1 到 8 脚功能与 POE 供电脚位 |
| A8 | 常用端口号速查 | 端口与服务对照表，可搜索 |
| A9 | MAC 地址工具 | 格式转换，单播与组播判断 |
| A10 | 光纤 / 双绞线规格与最大距离 | Cat5e、Cat6、Cat6a、多模、单模在各速率下的距离上限 |
| A11 | 无线信道规划速查 | 2.4G 全信道中心频率、不重叠信道建议、5G 信道 |
| A12 | WiFi 信号强度换算 | dBm 与 mW 互转，附强度等级参考 |
| A13 | 网络故障排查命令速查 | ping、tracert、nslookup、ipconfig、netstat 常用写法 |

### B. 建筑智能化 / 弱电（13 个）

| 编号 | 工具 | 说明 |
|---|---|---|
| B1 | 综合布线线缆长度估算 | 按点位、水平与垂直距离、余量系数算线缆用量和箱数 |
| B2 | 桥架 / 管路填充率计算 | 线缆截面积与桥架、管径比对，判断是否超容 |
| B3 | 弱电点位统计与工程量估算 | 分系统统计点位并估算辅材 |
| B4 | 视频监控存储容量计算 | 路数、码率、天数、编码方式算出容量与硬盘配置 |
| B5 | 机房 UPS 容量计算 | 由负载功率和后备时间算 UPS 容量与电池容量 |
| B6 | 精密空调制冷量估算 | 按 IT 负载与房间面积估算制冷量 |
| B7 | BA 点位表模板 / DDC 点位统计 | AI、AO、DI、DO 点数规则与 DDC 数量估算 |
| B8 | 中央空调时间型计费计算 | 按 FCU 档位运行时长与权重算用量和费用 |
| B9 | 冷量计费计算 | 由流量、供回水温差和时长累计冷量与费用 |
| B10 | 照度计算（流明法 / 利用系数法） | 由面积、目标照度、光通量与利用系数反算灯具数 |
| B11 | 灯具数量估算 | 按光效和照度标准快速估算灯具数量 |
| B12 | 弱电系统图例 / 符号速查 | 常见弱电符号与图例对照 |
| B13 | 设备参数速查 | 电梯、水泵、风机等常用设备参数范围 |

### C. 工业自动化控制（17 个）

| 编号 | 工具 | 说明 |
|---|---|---|
| C1 | 模拟量换算（4-20mA / 0-10V ↔ 工程量） | 原始值线性定标，正反算与斜率截距 |
| C2 | PT100 / 热电偶温度换算 | 电阻值或 mV 与温度互算，含负温 |
| C3 | 数据类型 / 进制换算（INT/DINT/REAL/WORD/BCD） | 位宽、有无符号与 BCD 互转 |
| C4 | IEEE754 浮点转换 | 浮点与十六进制双向转换，含字节序 |
| C5 | 常用工程单位换算 | 压力、温度、长度、力、流量等 |
| C6 | PID 参数速查与调试思路 | 常见工况的经验参数与整定步骤 |
| C7 | 三相电机电流 / 功率 / 扭矩 / 转速计算 | 由功率、电压、功率因数、效率、转速互算 |
| C8 | 变频器参数速查 | 常见参数号含义、加减速时间与载波频率 |
| C9 | 伺服选型速查 | 按负载与转速扭矩给出功率档位建议 |
| C10 | 电缆选型与电压降计算 | 按电流、线长、截面算压降与压降百分比 |
| C11 | 导线载流量速查 | 铜芯各截面在不同敷设方式下的载流量 |
| C12 | 电阻分压 / 限流电阻计算 | 分压与限流电阻取值及功耗 |
| C13 | 常用传感器输出信号速查 | PT100、热电偶、称重、流量计的输出形式 |
| C14 | 定时器 / 计数器换算 | ms、s、min、h 互转与时基换算 |
| C15 | Modbus 通信速查 | 功能码 01 到 16、异常码、寄存器地址与数据格式 |
| C16 | OPC-UA 速查 | 地址空间、节点与默认端口 |
| C17 | 常见故障代码 / 报警速查 | 常见 PLC 与变频器报警码 |

## 怎么用

### 在浏览器里直接用

打开部署好的地址就行。第一次打开后浏览器会缓存全部资源，之后没网也能用，「添加到主屏」可以当 App 用。

### 拷一个 HTML 文件走

`npm run build:single` 会产出一个 `index.html`（约 350 KB），JS、CSS 和标识图片全在里面，没有外部依赖。拷到 U 盘、发微信、放内网共享盘，双击就能打开，不需要服务器也不需要装东西。适合发给现场同事。

### 装到手机主屏

手机浏览器打开页面，菜单里选「添加到主屏」。iOS 用 Safari，安卓用 Chrome。装完之后是全屏的，跟原生 App 差不多，离线照常用。

首页可以收藏常用工具，之后在底部「收藏」里直接进。用过的工具会出现在「最近使用」。版本、作者、许可以及清空本地数据都在底部「关于」里。

## 本地开发

```bash
npm install

npm run dev            # 开发服务器，带热更新
npm run test           # 跑单元测试
npm run build          # 标准构建 → dist/（PWA，含 Service Worker 与 manifest）
npm run build:single   # 单文件构建 → dist-single/index.html
npm run preview        # 预览标准构建产物
```

两套构建输出到不同目录，互不影响。PWA 产物丢到任意静态托管（内网 Nginx、GitHub Pages、Cloudflare Pages 都行）。

## 加一个新工具

路由和首页都是按注册表动态生成的，所以加工具不用改路由、不用改首页。四步：

1. 写组件：`src/features/<domain>/XxxTool.tsx`。计算类工具可以直接用 `CalculatorView`，只要给出字段定义和计算函数。
2. 注册：在 `src/registry/<domain>.ts` 里追加一条 `ToolDef`，填 `id`、`code`、`title`、`keywords`、`Component`。
3. 加速查（可选）：在 `src/data/<domain>/xxx.json` 写数据，遵循 `QuickRefTable` 的结构，记得填 `source` 和 `updatedAt`，然后在注册项里设 `quickRefId`。
4. 抽计算并补测试：计算逻辑放 `src/lib/calc/`，在 `src/__tests__/` 加对应单测，边界值（0、负数、极值）至少要覆盖到。

## 目录结构

```
src/
├── types/       数据契约，唯一真源：tool / quickref / calculator / store
├── registry/    工具注册表，配置驱动的核心：index / network / building / automation
├── data/        速查数据，与代码分离：network / building / automation 下的 JSON
├── lib/
│   ├── calc/    纯计算函数，不依赖 React，可单独测试
│   ├── engine/  单位换算引擎，按类别和因子注册
│   ├── search.ts    Fuse 索引与查询
│   ├── format.ts    数值舍入与格式化
│   ├── clipboard.ts 复制到剪贴板，含降级处理
│   └── url.ts       URL 参数序列化与回填
├── store/       状态与本地持久化
├── components/  公共组件
├── pages/       页面
└── features/    各工具的实现
```

## 技术选型

| 用途 | 选型 | 为什么 |
|---|---|---|
| 构建 | Vite 5 | 启动快，配置少，PWA 和单文件都有现成插件 |
| 框架 | React 18 + TypeScript | 43 个工具的配置驱动需要类型兜底 |
| 样式 | Tailwind CSS 3 | 颜色走 CSS 变量，切换主题只改一处 |
| 路由 | React Router 6（HashRouter） | 离线深链和单文件本地打开都不会 404 |
| 状态 | Zustand + persist | 收藏、最近使用、主题存 localStorage |
| 搜索 | Fuse.js | 纯前端全文检索，工具名、关键词、速查行内容一起索引 |
| 离线 | vite-plugin-pwa | Workbox 全量预缓存 |
| 单文件 | vite-plugin-singlefile | 拷一个 HTML 就能用 |

没引 MUI，没引大数库，没引 i18n 库。IP 和进制换算用原生 BigInt，金额计算用整数「分」，避免浮点误差。运行时依赖 gzip 后大约 95 KB。

## 数据来源与免责

计算公式参考通用工程教材与行业惯例；速查数据（线序、端口、信道、Modbus 功能码、载流量、照度标准等）整理自公开标准和厂家资料，每张速查表底部都标了依据和更新日期，方便追溯。

计算结果仅供参考。正式设计、选型、验收请以现行国家标准、行业规范和厂家手册为准。

## 兼容性

- 手机：iOS Safari 15+、Android Chrome 100+
- 桌面：Chrome、Edge、Firefox、Safari 最近两个大版本
- 视口 320px 到 1440px 都适配过，触控目标不小于 44px

## 反馈

有算错的地方、想要的新工具、或者数据过时了，都可以在 [Issues](https://github.com/liuyimr/NE_TOOL/issues) 里提。反馈时带上输入值和你期望的结果，我改起来会快很多。

## 许可

[MIT](LICENSE)

由 [新易科技工作室（NewE）](https://github.com/liuyimr) 开发维护。

---

## English

An offline-first toolbox for network engineers, building-automation (ELV) engineers and industrial-automation engineers. 43 calculators and quick-reference tables: subnet/CIDR calculator, T568A/T568B wiring, RJ45 pinout, common port numbers, WiFi channel planning, CCTV storage sizing, FCU time-based billing, 4-20mA scaling, PT100 conversion, Modbus function codes, three-phase motor and cable voltage-drop calculations, IEEE754, and more.

Vanilla front-end only. No backend, no login, no telemetry. Installable as a PWA and works fully offline after the first visit. A single-file HTML build is included for USB stick distribution.

Stack: Vite + React + TypeScript + Tailwind CSS + Zustand + Fuse.js. MIT licensed.
