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
