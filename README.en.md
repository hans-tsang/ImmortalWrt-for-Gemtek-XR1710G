<img src="https://avatars.githubusercontent.com/u/53193414?s=200&v=4" alt="logo" width="200" height="200" align="right">

# ImmortalWrt for Gemtek XR1710G

[![Build Status](https://img.shields.io/github/actions/workflow/status/naoki66/ImmortalWrt-for-Gemtek-XR1710G/build-firmware.yml?branch=master&label=Build)](https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G/actions/workflows/build-firmware.yml)
[![Sync Status](https://img.shields.io/github/actions/workflow/status/naoki66/ImmortalWrt-for-Gemtek-XR1710G/sync-upstream.yml?branch=master&label=Sync)](https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G/actions/workflows/sync-upstream.yml)
[![License](https://img.shields.io/badge/license-GPL--2.0-green)](https://spdx.org/licenses/GPL-2.0-only.html)

Customized ImmortalWrt firmware for Gemtek XR1710G (Brightspeed XR1710G).

## Quick Start

- Default router address: `http://192.168.50.1` or `http://immortalwrt.lan`
- Username: `root`
- Password: *(empty on first boot)*
- Default Wi-Fi SSIDs: `ImmortalWrt-2G`, `ImmortalWrt-5G`, `ImmortalWrt-6G`
- Default Wi-Fi password: `12345678` (change it after first login)

## Hardware

- SoC: Airoha AN7581GT (quad-core CPU + NPU)
- RAM: 2 GB
- Flash: 512 MB
- Ports: 2×10G + 2×1G
- Wi-Fi: MT7996 tri-band (2.4G/5G/6G)

## Included Features

- XR1710G device tree and platform-specific kernel patches
- Airoha NPU related acceleration and tuning support
- Fan control, recovery helper, and flow offload related LuCI apps
- WireGuard, SmartDNS, DDNS, UPnP, ZeroTier, and other network tools

## Build (local)

```bash
git clone https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G.git
cd ImmortalWrt-for-Gemtek-XR1710G
./scripts/feeds update -a
./scripts/feeds install -a
bash scripts/fix-stale-golang-host.sh
bash scripts/enforce-no-chinese.sh
cp config.seed .config
bash scripts/set-build-version.sh .config
make defconfig
make -j$(nproc) world 2>&1 | tee build.log
bash scripts/summarize-build-errors.sh build.log
```

## GitHub Actions Workflows

- `build-firmware.yml`: manual firmware build and optional release
- `sync-upstream.yml`: scheduled/manual sync from upstream ImmortalWrt
- `sync-and-scan.yml`: sync fork, build firmware, and run EMBA scan

## No-Chinese Policy

This repository enforces a no-Chinese-content policy for UI-related locale artifacts and top-level README updates during workflow runs:

- Removes Chinese LuCI locale directories (`zh-cn`, `zh_Hans`, `zh_CN`, `zh-tw`, `zh_Hant`, `zh_TW`)
- Disables `default-settings-chn` and Chinese LuCI i18n package selections in `config.seed` / `.config`
- Restores `README.md` from this English source file (`README.en.md`)

To apply manually:

```bash
bash scripts/enforce-no-chinese.sh
```

## License

[GPL-2.0-only](https://spdx.org/licenses/GPL-2.0-only.html)
