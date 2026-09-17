# Upstream release notes (English)

English versions of the release notes published by the upstream project
[`naoki66/ImmortalWrt-for-Gemtek-XR1710G`](https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G/releases).
The upstream notes are written in Chinese; the entries below are translations
kept here so that the releases of this repository can list them in English.

Newest first. Add a new section at the top when a new upstream release appears.

## 20260916 (`20260916-e8702ccc61`)

- Synced upstream ImmortalWrt updates.
- Added one-click switching between AP mode and router mode.
- Added one-click mesh networking for multiple XR1710G units, including
  802.11s wireless backhaul (experimental) and wired mesh.
- Fixed the web U-Boot recovery page failing to reboot into U-Boot (issue 43).
- Fixed automatic synchronization of wireless parameters.

Do not keep the existing configuration when upgrading to this build.

## 20260908 (`20260908-4974641d84`)

- Synced Realtek DSA MTU support and several hostapd MLO fixes.
- Synced the official ImmortalWrt sources (wifi-scripts, linux-firmware and
  others).
- Synced the Realtek DSA/GPIO patches and the mt76 NPU state flush.
- Synced a large set of Realtek DSA patches, the kernel update from 6.12 to
  6.12.108, and the wifi-scripts `auth_type` fix.
- Synced the latest upstream mt76 / MT7996 wireless drivers.
- Removed the overclocking feature, which was unstable and caused reboots.
- Improved the restrictions on the acceleration switches so that enabling them
  incorrectly can no longer break networking.
- Added a device MAC / serial number editing tool that fixes the wrong MAC
  address on cloned units (requires the matching U-Boot).
- Reworked the NPU/FlowSense UI: router mode is detected automatically and the
  wording was standardized.
- Removed the noisy auto-negotiation (AN) diagnostic logging.

This build contains many changes; keeping the existing configuration is not
recommended. If you run into problems, reset to factory defaults and configure
the device again manually.

## 20260903 (`20260903-0e959250f7`)

- Fixed the XR1710G WAN network migration.
- Removed `623-net-pcs-airoha-add-AN7581-rx-lock-diagnostics.patch`.

## 20260831 (`20260831-2c99fd68fc`)

- `01a84f731a`, `055e2c9033`: fixes for XR1710G RTL826x/USXGMII verified on
  real hardware.
- `e6d1e3ea88`: removed kernel patches that are already upstream.
- `88b74a6bf4`: removed hostapd patches that are already upstream.

## 20260820 (`20260820-6f3065c69b`, pre-release)

- Attempt to enable MT7996 WED offload.

## 20260817 (`20260817-131c62d`)

- No release notes were published upstream for this build.

## 20260815 (`20260815-a8ed1a3815`)

Full NPU hardware acceleration in VLAN + AP mode.

- Raised the priority of the NPU PPE, which addresses the following:
  - IPv6 Wi-Fi to NAS was unbound (UNB) and fell back to software forwarding at
    about 850 Mbit/s.
  - Occasional IPv6 binding happened only when a high packet-count bit was set
    by chance, or when an existing IPv4 L2 template was reused, so it was not
    reliable.
  - IPv6 NAS to Wi-Fi fell back successfully and was accelerated normally.
  - IPv4 could always create flowtable entries, so both directions were bound
    (BND) and accelerated normally.

## 20260810 (`20260810-b6dcb7c`)

NPU hardware acceleration in VLAN + AP mode is now official.

- Reworked the AP mode offload switch so that the firewall, VLAN filtering and
  NPU/PPE offload can be used together; the FlowSense / NPU pages now show the
  AP acceleration status. Enabling it in router mode breaks internet access.
- Added *System - U-Boot recovery*, which reboots into U-Boot from the web
  interface. It requires the matching U-Boot build from
  <https://github.com/naoki66/XR1710G-http-uboot/releases/tag/2026-8-10-2035a514b3fa>.
- Reworked the FlowSense, fan and recovery page UI, fixed the 6 GHz radio to
  channel 37 to keep 30 dBm, and disabled IPv6 DNS/RA announcements.
- Fixed the version string.

## 20260809 (`20260809-a96a9ec`)

Wi-Fi fixes (main focus):

- Rewrote the Wi-Fi initialization path, completing SSID, encryption and
  country code handling.
- Added hardware-ready polling to the `uci-defaults` script, fixing Wi-Fi not
  being enabled when MT7996 PCIe link training finishes after `kmodloader`
  returns.
- Tuned the radio parameters: 2.4 GHz to HE20 at 28 dBm; 5 GHz to EHT160 on
  channel 36 at 30 dBm with all beamformer options enabled; 6 GHz to EHT320 on
  auto at 30 dBm with BSS Color and TWT enabled.
- Throttled multi-VAP creation in hostapd: with 7 or more BSSes it sleeps
  200 ms every 3 interfaces, and the restart wait was extended to 400 ms.
- Added `nofile=8192` to `wpad.init` to fix "Too many open files" with many
  interfaces.
- Fixed the `rdinit=/sbin/init` boot warning; this requires the latest U-Boot.

Network fixes:

- Fixed the default firewall script, restoring `flow_offloading` /
  `flow_offloading_hw` and cleaning up the firewall whiteout.
- Corrected the RTL8261N firmware package name as an attempt to fix WAN/LAN2
  not getting an IP address on some units (please verify on your own device).
- Raised the default system socket buffers to 512 KB for setups with 12 or more
  VAPs.

Configuration changes:

- Default LAN IP changed from 192.168.1.1 to 192.168.50.1.
- Added `/etc/config/wireless` to the sysupgrade keep list, so Wi-Fi settings
  survive an upgrade that keeps the configuration.
- Enabled WireGuard and its dependencies: `kmod-wireguard`, `wireguard-tools`,
  `luci-proto-wireguard` and `rpcd-mod-wireguard`.

## 20260808 (`20260808-235da647`)

Improvements:

- Hardware flow offload: enabled the default XR1710G PPE hardware flow table
  configuration and fixed the bridge egress forwarding path on a PPE cache
  miss.
- Built the NPU firmware into the kernel, fixing the firmware load failure
  (error -2) very early in boot, before the rootfs is mounted.
- Downgraded the RTL8261BE PMA low-power suspend boot message from warning to
  info, removing a harmless warning.

Initial configuration:

- Improved the IPv6 setup for mainland China (SLAAC), fixing slow access to
  apps such as WeChat and Taobao.
- Wireless security: encryption is enabled by default with the password
  `12345678`, preventing invalid configurations that keep the radio disabled.
- Improved fan control and added a manual fan mode with custom temperature and
  speed.

Stability fixes:

- Wi-Fi performance: reverted the forced EHT beamforming, fixing reduced 5 GHz
  throughput on clients that do not support it.
- hostapd `ENFILE` race: added a 200 ms delay before restarting multi-VAP
  interfaces, removing the transient "Too many open files" error when several
  SSIDs come up at once.
- rpcd hang protection: added a deadline to the LuCI `devmem` read so that
  rpcd can no longer hang forever.
- Distributed the XR1710G Wi-Fi workers evenly across the CPU cores.

## 20260805 (`20260805-cca8a70`)

- Fixed `luci-app-airoha-npu`.
- Completed the Chinese translation of `luci-app-airoha-flowsense`.
- Fixed `luci-app-lucky`.

## 20260805 (`20260804`)

Highlights:

- Synced the latest ImmortalWrt upstream sources.

Fixes:

- Fixed the occasional failure of the 10G port to obtain an IP address.
- Fixed the built-in crontab jobs, which can control the front status LED on a
  schedule (remove the `#` comment to enable them).
- Fixed the hostapd "Too many open files" error.

System changes:

- Removed several packages that slowed down the firewall, improving firewall
  performance. They can be reinstalled from *System - Software*.
- Changed the version string format to date-upstream hash-local hash, making it
  easier to tell whether the firmware is up to date.

Online upgrade rework:

- Upgrades are now done directly from *System - Backup / Flash Firmware*;
  entering U-Boot is no longer required.
- Upgrading while keeping the current configuration is supported.
- Warning: when upgrading across major versions, do not keep the configuration,
  to avoid compatibility problems.

## 20260803 (`20260803-ed211d8`)

- Synced the upstream sources and updated the kernel to 6.18.41.
- Fixed wireless links negotiating down to X1.
- Fixed low wireless throughput.
- Fixed occasional wireless lockups.
- Fixed the PPE not being part of a firewall zone.
- Fixed an infinite loop in the MT7996 power-save sync event parsing.
- Relaxed the FlowSense detection logic and made the detection IP
  configurable.

## 20260719 (`20260719-5747ad3`)

- If wireless or the wired LAN ports do not work after flashing an older build,
  update U-Boot from <https://github.com/naoki66/XR1710G-http-uboot/releases>.
