RAMFS_COPY_BIN='fitblk fit_check_sign'

REQUIRE_IMAGE_METADATA=1

# Boards that only exist in this fork.  They are handled in dedicated blocks
# below instead of being added to the upstream case statements, so that new
# upstream boards never conflict with them during an automatic sync.
local_fit_boards() {
	case "$1" in
	gemtek,xg2010g-ubi|\
	gemtek,xg2010g|\
	gemtek,xr1710g-ubi)
		return 0
		;;
	esac

	return 1
}

nokia_initial_setup()
{
	[ "$(rootfs_type)" = "tmpfs" ] || return 0

	fw_setenv bootcmd "flash read 0xc0000 0x800000 0x85000000; bootm 0x85000000"
}

platform_check_image() {
	local board=$(board_name)

	[ "$#" -gt 1 ] && return 1

	if local_fit_boards "$board"; then
		fit_check_image "$1"
		return $?
	fi

	case "$board" in
	nokia,xg-040g-md)
		nand_do_platform_check "$board" "$1"
		return $?
		;;
	nokia,xg-040g-md-ubi|\
	quantum,q1000k-ubi)
		fit_check_image "$1"
		return $?
		;;
	esac

	return 0
}

platform_do_upgrade() {
	local board=$(board_name)

	if local_fit_boards "$board"; then
		fit_do_upgrade "$1"
		return
	fi

	case "$board" in
		gemtek,w1700k-ubi|\
		nokia,xg-040g-md-ubi|\
		quantum,q1000k-ubi)
			fit_do_upgrade "$1"
			;;
		*)
			nand_do_upgrade "$1"
			;;
	esac
}

platform_pre_upgrade() {
	local board=$(board_name)

	case "$board" in
	nokia,xg-040g-md)
		nokia_initial_setup
		;;
	*)
		;;
	esac
}
