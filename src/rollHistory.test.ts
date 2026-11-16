import { afterEach, expect, test, vi } from "vitest"

afterEach(() => {
	vi.unstubAllGlobals()
	vi.resetModules()
})

test("clears either spelling of a collection ID and keeps the cleared history across reloads", async () => {
	let persisted = '{"collection:a":400,"a":300,"collection:b":200,"deleted":100}'
	vi.stubGlobal("localStorage", {
		getItem: () => persisted,
		setItem: (_key: string, value: string) => { persisted = value },
	})
	const history = await import("./rollHistory")
	const a = { id: "collection:a", collectionId: "a" }
	const b = { id: "collection:b", collectionId: "b" }
	const onHistoryChange = vi.fn()
	const unsubscribe = history.subscribeToRollHistory(onHistoryChange)

	expect(history.getLastRoll(history.loadRollHistory(), a)).toBe(400)
	expect(history.clearRoll(a)).toBe(true)
	expect(onHistoryChange).toHaveBeenCalledOnce()
	expect(history.loadRollHistory()).toEqual({ "collection:b": 200, deleted: 100 })

	unsubscribe()
	vi.resetModules()
	const restarted = await import("./rollHistory")
	expect(restarted.getLastRoll(restarted.loadRollHistory(), a)).toBe(0)
	expect(restarted.getLastRoll(restarted.loadRollHistory(), b)).toBe(200)

	const installed = { id: "builtin:installed" }
	restarted.recordRoll(installed.id)
	expect(restarted.getLastRoll(restarted.loadRollHistory(), installed)).toBeGreaterThan(0)
	expect(restarted.getLastRoll(restarted.loadRollHistory(), b)).toBe(200)
	expect(restarted.clearAllRolls()).toBe(true)
	vi.resetModules()
	const cleared = await import("./rollHistory")
	expect(cleared.loadRollHistory()).toEqual({})
	expect(onHistoryChange).toHaveBeenCalledOnce()
})
