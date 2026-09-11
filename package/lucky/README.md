# Lucky for OpenWrt

This directory packages [Lucky](https://github.com/gdy666/lucky) and `luci-app-lucky` for OpenWrt.

## Summary

- Provides the Lucky service and LuCI integration
- Supports DDNS, reverse proxy, Wake on LAN, IPv4/IPv6 forwarding, and related features
- Upstream LuCI package source: https://github.com/sirpdboy/luci-app-lucky

## Build notes

1. In `make menuconfig`, enable both `Utilities -> lucky` and `LuCI -> Applications -> luci-app-lucky`.
2. Build the packages with `make package/lucky/compile package/luci-app-lucky/compile` or include them in a full firmware build.

## Upstream references

- Lucky: https://github.com/gdy666/lucky
- LuCI app: https://github.com/sirpdboy/luci-app-lucky
