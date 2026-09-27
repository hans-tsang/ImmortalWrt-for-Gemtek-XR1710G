# Changelog

This file records notable feature, stability, and maintenance changes to the
XR1710G firmware repository. Routine ImmortalWrt upstream merges are not listed
item by item; only changes that affect how this device is built or behaves are
recorded here.

## 2026-09-15

### Release packaging

- Stopped repeating the build ID in firmware file names. The image name now
  carries the version once, for example
  `immortalwrt-naoki66-<date>-<repo>-<upstream>-airoha-an7581-gemtek_xr1710g-...`,
  instead of repeating `<date>-<repo>-<upstream>` three times.
- Releases now upload every file listed in `sha256sums`, including the package
  `.manifest` and `profiles.json`, so checksum verification no longer refers to
  missing files.
- Release notes are now generated from the actual build: device, firmware file
  name and its SHA-256, repository commit, upstream commit and flashing steps
  are filled in automatically, and the manually supplied notes are added under
  a "Changes in this build" heading. This prevents notes that contradict the
  build, such as claiming that no firmware was built.

## 2026-09-23

本条目覆盖 XR1710G 从 `20260916-e8702ccc61` 到 `b94f6f29b3` 的变更。同期
XG2010G 专属的 PON、ToD、BoB 和 PCM/语音功能不计入 XR1710G 运行面。

### 上游同步

- 合并 ImmortalWrt `master` 至 `b80b090e8e`，本地 merge commit 为
  `b94f6f29b3`；此前还通过 `669668ec3e` 和 `ba2d9bc4f3` 引入上游。
- Linux 6.18 从 `.44` 更新到 `.52`，包含 6.18.45 至 6.18.52 的稳定版
  修复，并同步刷新 Airoha、Realtek PHY 和通用内核补丁上下文。
- 引入 Airoha 上游改动，包括 Quantum Fiber Q1000K、RX ring 扩容、
  AN7583 PCIe Gen3 PHY，以及 phylink/PCS 相关修复。
- 引入 netifd、mac80211、procd、odhcpd、dnsmasq、dropbear 和 comgt
  等共享软件包更新；其中 mt76 TX worker CPU 绑定和流卸载修复对 XR1710G
  的无线与转发路径有直接影响。

### XR1710G 设备与网络

- 为 XR1710G 的 Airoha I2C 控制器设置 `airoha,airoha-i2c` 兼容项和
  400 kHz 总线频率，继续支持 NCT7802 硬件监控。
- 增加 AN7581 10G PCS link bring-up 修复，覆盖 JCPLL/TCLVAR、PCS
  restart 和按接口跟踪 PCS 状态。
- 同步 phylink PCS 到 v15 API：PCS provider 使用引用计数式
  acquire/release，PCS list 由 state mutex 保护，并补齐 PCS disable、
  link down 和 major configuration 强制重建路径。
- 修复 RTL8261BE/RTL8261N USXGMII SerDes reset work 与 PHY teardown
  的竞态：PHY 离开 running 状态时禁止并停用 delayed work，阻止旧 work
  在设备关闭后继续访问 SerDes 或重新排队。
- Airoha MAC 在共享 QDMA 停止后断开 PHY，避免重新打开接口时复用已被
  teardown 的 link state。
- 将 MT7996 板级默认值、无线缓冲区、PPE reload 和 packet steering
  移入 `airoha-an7581-mt7996-board`，由 XR1710G/W1700K 选择。
- 明确排除 PON firmware/manager、xPON、GPON IGMP、PON VLAN、ToD 和
  PCM/语音组件，避免 XG2010G 功能进入 XR1710G 镜像或内核配置。
- 对照 `immortalwrt_pon` 的 `675-01`、`675-02` 和 `675-09` 补充桥接
  conntrack 的 PPPoE、PPPoE-in-Q 和双层 VLAN（内层 802.1Q，外层
  802.1Q/802.1ad）跟踪；修复非零 network offset 下的 L3/L4 校验和计算。
- 在 XR1710G 的 XFRM/SOE flow offload 补丁之后检查 `nft_thoff()`：
  未解析 L4 偏移时跳过卸载，保留软件转发，避免双层 VLAN/PPPoE 流量
  被错误绑定到 PPE；现有 `meta l4proto { tcp, udp }` firewall4 规则不受影响。

### LuCI 与 Mesh

- `luci-app-airoha` 统一 NPU 与 FlowSense 页面，状态和端口拓扑按设备树
  生成，补充 CPU governor/max_freq 持久化、刷新时间、暗色主题和中英文翻译。
- `luci-app-mesh-conf` 增加 DAWN 客户端引导、802.11k/v/r 支持和 6 GHz
  频段补丁，并修复同步服务自愈、执行位和 SAE key 被空值覆盖的问题。
- 新栈 `airoha-ponctl`、`airoha-pond`、`luci-app-pon`、ToD PHC 和 EN7581
  PCM-SPI 语音功能仅进入 XG2010G 配置，不随 XR1710G 构建。

### 构建与版本

- 新增 `1710.config` 与 `2010.config` 双配置构建入口，GitHub Actions 可选择
  设备配置，release 名称和文件名会包含对应型号。
- 固件版本改为根据 `CONFIG_TARGET_PROFILE` 自动识别 XR1710G/XG2010G。
- 新增 Gemtek profile 隔离检查，在构建前检查配置，在构建后检查 kernel
  config 和 image manifest，防止 XR1710G 与 XG2010G 包集合互相污染。
- 远程构建脚本支持选择 1710 或 2010 配置，构建失败时会尝试带 `V=s`
  重新编译并保留详细日志。

### 验证

- `git diff --check` 通过。
- XR1710G 和 XG2010G 的 profile 隔离检查均通过。
- 本轮未执行完整固件构建。

关键提交：`4b4ed05f79`、`31eda9dc56`、`4ebc4c2c9b`、`759359070c`、
`b94f6f29b3`。

## 2026-09-14

### Upstream sync

- Merged ImmortalWrt `master` up to `3e246256ce`.
- Reviewed the Airoha AN7581/AN7583 patch set against OpenWrt `main`
  `0d7bfcb7e31e`.

### Airoha networking fixes

- Backported OpenWrt `002faeed3c91792a02abdb6f39b1a6b74052e992`:
  `net: airoha: grow the small RX rings`.
- Grew the forced-to-CPU RX ring 4 from 16 to 128 descriptors, reducing the
  risk of RX ring exhaustion under bursty traffic such as PPPoE Discovery,
  LCP, IPCP, CHAP, DHCPv6, and LLDP.
- Raised the default descriptor count of the other small RX rings from 16 to
  32, matching the vendor SDK default.
- Refreshed the patch context of `310-10`, `916-02`, `920-12`, and `920-13` so
  they apply against the new `RX_DSCP_NUM()` definition; their original
  functionality is unchanged.

### Patch cleanup

- Dropped `303-01` and `303-02`, which had no consumers. They only prepared
  exported symbols, a shared register header, and a calibration wait helper
  for an Airoha PHY software calibration series that was never imported.
- Dropped the `0403` PM Domain Kconfig fix, which duplicated upstream
  `221-01`. `221-01` remains the single implementation that enables
  `AIROHA_CPU_PM_DOMAIN` for `ARCH_AIROHA`.
- Kept the RTL826x SerDes, AN7581 USXGMII, PCIe 3.0 x2, NPU, PPE/flowtable,
  GPIO, MIB statistics, and BL31-less boot compatibility patches that XR1710G
  requires.
- Did not import OpenWrt `602-04`, because it only provides the AN7583 PCIe
  PHY driver, which the XR1710G AN7581 configuration does not enable.

### Verification

- The new RX ring patch and the official OpenWrt file share the same Git blob
  `3a21a65022acaba07679f01663678afbccc9b640`.
- `git diff --check` passes; no BOM or CRLF was introduced into the Airoha 6.18
  patch directory.
- No firmware or kernel build was performed, as agreed for this maintenance
  round.

Related commit: `a6b69e04dc`.

## 2026-09-08

- Added `msleep` to ucode and replaced the existing `uloop.sleep` calls to
  avoid unnecessary event loop blocking.

Related commit: `4974641d84`.

## 2026-09-07

- Added `scripts/set-build-version.sh`, which writes the build date, repository
  commit, and upstream commit into the build configuration.
- Reworked the Airoha NPU and FlowSense pages: unified the wording for VLAN tag
  offload and PPPoE passthrough offload, added device mode detection, and
  restricted bridge offload actions that do not apply in router mode.
- Removed the overclocking feature from the NPU page.
- Added and improved `luci-app-airoha-factory` with support for viewing and
  changing the factory serial number and MAC/BSSID, and fixed MTD partition
  detection, RPC script permissions, and form interaction issues.
- Fixed MT7996 power synchronization event parsing and EEPROM transmit power
  handling.
- Updated the RTL826x SerDes patches and refreshed patch context for Linux
  6.18.44.

Corresponding release tag: `20260907-ea01178178`.

## 2026-08-31

- Fixed AN7581 USXGMII rate adaptation, RX calibration, and the optional TX FIR
  parameters on XR1710G.
- Restored and stabilized the RTL826x host-side SerDes configuration, improving
  negotiation between the 10G PHY and the AN7581 PCS.
- Fixed missing Airoha MIB statistics, AN7581 GPIO muxing, and PPE
  classification of bridged local traffic.
- Improved VLAN ingress handling, bridge L2 fallback, DHCP client
  identification, and in-image `px5g` support.

Corresponding release tag: `20260831-131ef84fe9`.

## 2026-08-20

- Merged the YYH XR1710G Linux 6.18 integration and unified the AN7581/AN7583
  kernel patch baseline.
- Removed backports already present in the Linux 6.18.44 baseline and refreshed
  the context of the Airoha patches that are still required.
- Kept the XR1710G device tree, PCIe 3.0 x2, NPU/Wi-Fi offload, SOE/XFRM, and
  the local LuCI customizations.
- Fixed custom firmware version metadata being overwritten after upstream
  merges.

Corresponding release tag: `20260820-a60889b870`.
