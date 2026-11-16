import type { GamepadEvent } from "@decky/ui"

export const moveGamepadFocus = (event: GamepadEvent, target?: HTMLElement | null) => {
	if (!target?.isConnected || ("disabled" in target && target.disabled)) return

	target.focus()
	if (target.ownerDocument.activeElement !== target) return

	target.scrollIntoView({ block: "nearest" })
	event.preventDefault()
	event.stopPropagation()
}
