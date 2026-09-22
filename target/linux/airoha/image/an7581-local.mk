# Device definitions that only exist in this fork.  They live in a separate
# file (included by image/Makefile) so that upstream additions to an7581.mk
# never overlap with them, which used to break every automatic upstream sync.

define Device/gemtek_xr1710g-ubi
  DEVICE_VENDOR := Gemtek
  DEVICE_MODEL := XR1710G
  DEVICE_VARIANT := UBI
  DEVICE_ALT0_VENDOR := Brightspeed
  DEVICE_ALT0_MODEL := XR1710G
  DEVICE_ALT0_VARIANT := UBI
  SUPPORTED_DEVICES := gemtek,xr1710g-ubi
  DEVICE_DTS := an7581-xr1710g-ubi
  DEVICE_PACKAGES := airoha-en7581-mt7996-npu-firmware airoha-an7581-mt7996-board fitblk uboot-envtools kmod-i2c-an7581 \
		    kmod-hwmon-nct7802 kmod-mt7996-firmware wpad-mesh-mbedtls \
		    rtl826x-firmware px5g-mbedtls
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  UBOOTENV_IN_UBI := 1
  KERNEL_IN_UBI := 1
  KERNEL := kernel-bin | gzip
  KERNEL_INITRAMFS := kernel-bin | lzma | fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 128k
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  IMAGES := sysupgrade.itb
  IMAGE/sysupgrade.itb := append-kernel | fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | append-metadata
  SOC := an7581
endef
TARGET_DEVICES += gemtek_xr1710g-ubi

define Device/gemtek_xg2010g-ubi
  DEVICE_VENDOR := Gemtek
  DEVICE_MODEL := XG2010G
  DEVICE_VARIANT := UBI
  DEVICE_DTS := an7581-gemtek-xg2010g-ubi
  DEVICE_COMPAT_VERSION := 2.0
  DEVICE_COMPAT_MESSAGE := Firmware must use the XG2010G UBI layout with \
       the fit volume inside the ubi partition at 0x00600000. Upgrade only \
       the ubi partition and keep bootloader, uenv, dsd and reserved_bmt intact.
  DEVICE_PACKAGES := fitblk kmod-leds-gpio kmod-gpio-button-hotplug \
	kmod-airoha-xpon-en757x airoha-pon-manager
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  UBINIZE_OPTS := -E 5
  KERNEL_IN_UBI := 1
  KERNEL := kernel-bin | gzip
  KERNEL_INITRAMFS := kernel-bin | lzma | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 128k
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  IMAGES := sysupgrade.itb
  IMAGE/sysupgrade.itb := append-kernel | \
	fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | \
	append-metadata
  SUPPORTED_DEVICES := gemtek,xg2010g-ubi gemtek,xg2010g
  SOC := an7581
endef
TARGET_DEVICES += gemtek_xg2010g-ubi
