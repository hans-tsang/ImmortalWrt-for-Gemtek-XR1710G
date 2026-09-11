# Lucky for OpenWrt

This directory packages [Lucky](https://github.com/gdy666/lucky) and `luci-app-lucky` for OpenWrt.

## Summary

- Provides the Lucky service and LuCI integration
- Supports DDNS, reverse proxy, Wake on LAN, IPv4/IPv6 forwarding, and related features
- Upstream LuCI package source: https://github.com/sirpdboy/luci-app-lucky

## Build notes

Enable both `lucky` and `luci-app-lucky` in your OpenWrt configuration, then build firmware as usual.

## Upstream references

- Lucky: https://github.com/gdy666/lucky
- LuCI app: https://github.com/sirpdboy/luci-app-lucky
