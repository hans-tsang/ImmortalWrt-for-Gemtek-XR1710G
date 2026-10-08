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

## 2026-10-08

### 同步 ImmortalWrt 上游至 6.18.54

- 合并 `immortalwrt/immortalwrt` 的 306 个上游提交，内核补丁基线从 6.18.52
  推进到 6.18.54。
- 上游将 RTL8261C/D 的 LED 支持从 `hack-6.18/750-*` 迁出，改为新增
  `pending-6.18/721-02-net-phy-realtek-add-LED-support-for-RTL8261C-D.patch`
  并补齐亮度、极性和使能位处理，因此删除本地已无用的 `hack-6.18/750-*`。
- `pending-6.18/737-02` phylink PCS 补丁改用上游版本：本地此前的 v15 写法
  与上游 v3 写法功能完全等价，而上游版本已按 6.18.54 基线校订行号。
- `pending-6.18/743` RTL8261N USXGMII SerDes 补丁保留本地的 `sds_work`
  竞态修复语义（`READ_ONCE`/`WRITE_ONCE` 发布顺序，以及每次寄存器访问前和
  重新排队前的 disable 检查），叠加在上游的行号框架之上。

### 修正路由式 IPTV 组播丢包（引入 PonWrt #29）

- 引入 `pbs05/ponwrt#29` 的 `airoha: restore opt-in fraglist GRO` 修复。上游
  `hack-6.18/600` 把 `NETIF_F_GRO_FRAGLIST` 设为默认开启后，fraglist GRO 会把
  同流连续 UDP 报文合并成保留 DF 标志的超大 skb，该 skb 经 IPv4 组播路由转发
  时在 `ipmr_prepare_xmit()` 被静默丢弃，导致高码率 IPTV 流大量丢包（组播不可
  分片、无法收到 ICMP 错误，只有 `FragFails` 递增）。
- 新增 `target/linux/airoha/patches-6.18/980-revert-fraglist-gro-by-default.patch`，
  在 airoha target 内把 fraglist GRO 恢复为 opt-in 默认关闭，不改动通用补丁。
- 该修复只影响 `NETIF_F_GRO_FRAGLIST` 软件路径，与 XR1710G 的
  `NETIF_F_GRO_HW` 硬件 GRO（916-02 补丁）互不影响。

## 2026-10-01

### XG2010G FIT resizing and artifact validation

- Fixed the assumption that the current 339-LEB dynamic `fit` volume is a fixed
  partition limit. U-Boot and sysupgrade preserve `fip`, `ubootenv`, `ubootenv2`,
  and `factory`, remove `rootfs_data`, then recreate `fit` to match the new
  image size. The build limit is now 64 MiB, matching U-Boot's
  `0x90000000`/`0x94000000` double-buffer range.
- GitHub Actions and remote world builds now check each selected device's
  sysupgrade ITB, preventing a build that produced only a manifest from being
  reported as successful after `check-size` removed an oversized image.

## 2026-09-30

### XG2010G firmware generation and ONU package rename

- Updated the XG2010G config from `luci-app-pon` to its renamed package,
  `luci-app-onu`, and synchronized the XR1710G isolation rules and documentation.
- Disabled the XG2010G initramfs target to prevent parallel builds from
  overwriting the normal kernel with an initramfs kernel before appending
  squashfs to the FIT, which duplicated the firmware contents and failed the
  `IMAGE_SIZE` check.
- XG2010G no longer selects `luci-theme-glass`; the XR1710G config still does.
- The profile isolation check now requires `luci-app-onu` and rejects enabling
  initramfs in the XG2010G config.

## 2026-09-28

### XG2010G PON userspace and LuCI

- Switched the `pon_userspace` feed from `pbs05/openwrt-pon-userspace` to
  `naoki66/openwrt-pon-userspace`.
- Organized the new `luci-app-pon` pages under Network → ONU by status, hardware
  identity, authentication, IPTV, voice, and diagnostics.
- Moved the IPTV page, ACL, UCI configuration, and application services into
  `luci-app-pon`, and removed the deprecated standalone `luci-app-iptv` package
  selection from the XG2010G config.
- Enabled the `pon_userspace` feed and `luci-app-pon` only in the XG2010G
  `2010.config`; they remain explicitly disabled in the XR1710G `1710.config`.

## 2026-09-23

This entry covers XR1710G changes from `20260916-e8702ccc61` to
`b94f6f29b3`. XG2010G-specific PON, ToD, BoB, and PCM/voice functionality from
the same period is not part of the XR1710G runtime.

### Upstream sync

- Merged ImmortalWrt `master` through `b80b090e8e` in local merge commit
  `b94f6f29b3`; earlier upstream syncs were brought in through `669668ec3e` and
  `ba2d9bc4f3`.
- Updated Linux 6.18 from `.44` to `.52`, including stable fixes from 6.18.45
  through 6.18.52, and refreshed Airoha, Realtek PHY, and generic kernel patch
  context.
- Added Airoha upstream changes including Quantum Fiber Q1000K, RX ring
  expansion, the AN7583 PCIe Gen3 PHY, and phylink/PCS fixes.
- Synced shared software updates including netifd, mac80211, procd, odhcpd,
  dnsmasq, dropbear, and comgt. The mt76 TX worker CPU affinity and flow
  offloading fixes directly affect XR1710G wireless and forwarding.

### XR1710G device and networking

- Set the XR1710G Airoha I2C controller's `airoha,airoha-i2c` compatible and
  400 kHz bus frequency to retain NCT7802 hardware monitoring support.
- Added AN7581 10G PCS link bring-up fixes covering JCPLL/TCLVAR, PCS restart,
  and per-interface PCS state tracking.
- Updated phylink PCS to the v15 API: providers use reference-counted
  acquire/release, the PCS list is protected by the state mutex, and PCS
  disable, link down, and forced major-configuration rebuild paths are covered.
- Fixed a race between RTL8261BE/RTL8261N USXGMII SerDes reset work and PHY
  teardown. Leaving the running state disables and stops delayed work, so old
  work cannot access the SerDes after shutdown or requeue itself.
- The Airoha MAC now disconnects the PHY after stopping shared QDMA, preventing
  a reopened interface from reusing link state that has already been torn down.
- Moved MT7996 board defaults, wireless buffers, PPE reload, and packet
  steering into `airoha-an7581-mt7996-board`, selected by XR1710G/W1700K.
- Explicitly excluded PON firmware/manager, xPON, GPON IGMP, PON VLAN, ToD, and
  PCM/voice components to keep XG2010G functionality out of XR1710G images and
  kernel configs.
- Following `immortalwrt_pon` patches `675-01`, `675-02`, and `675-09`, added
  bridge conntrack support for PPPoE, PPPoE-in-Q, and double VLAN tags (inner
  802.1Q; outer 802.1Q/802.1ad), and fixed L3/L4 checksum calculation with a
  nonzero network offset.
- Added an `nft_thoff()` check after XR1710G's XFRM/SOE flow-offloading patch:
  skip offloading when the L4 offset is unresolved and keep software forwarding,
  preventing double-tagged VLAN/PPPoE traffic from being incorrectly bound to
  PPE. Existing `meta l4proto { tcp, udp }` firewall4 rules are unaffected.

### LuCI and Mesh

- `luci-app-airoha` unifies the NPU and FlowSense pages, generates status and
  port topology from the device tree, and adds persistent CPU governor/max_freq
  settings, refresh timing, dark-theme support, and bilingual translations.
- `luci-app-mesh-conf` adds DAWN client onboarding, 802.11k/v/r support, and a
  6 GHz band patch, and fixes sync-service recovery, executable permissions,
  and empty values overwriting SAE keys.
- The new `airoha-ponctl`, `airoha-pond`, `luci-app-pon`, ToD PHC, and EN7581
  PCM-SPI voice stack is selected only in the XG2010G config, not XR1710G builds.

### Build and versioning

- Added separate `1710.config` and `2010.config` build entry points. GitHub
  Actions can select a device config, and release names and files include the
  corresponding model.
- Firmware versions now identify XR1710G/XG2010G automatically from
  `CONFIG_TARGET_PROFILE`.
- Added Gemtek profile isolation checks for config before builds and kernel
  config/image manifests after builds, preventing package-set crossover between
  XR1710G and XG2010G.
- Remote build scripts can select either device config and retry failed builds
  with `V=s`, preserving detailed logs.

### Validation

- `git diff --check` passed.
- XR1710G and XG2010G profile isolation checks passed.
- A full firmware build was not run in this round.

Key commits: `4b4ed05f79`, `31eda9dc56`, `4ebc4c2c9b`, `759359070c`,
`b94f6f29b3`.

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
