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
	expect(history.loadRollHistory()).toEqual({
		"collection:b": { lastRoll: 200, count: 1, countIsMinimum: true },
		deleted: { lastRoll: 100, count: 1, countIsMinimum: true },
	})

	unsubscribe()
	vi.resetModules()
	const restarted = await import("./rollHistory")
	expect(restarted.getLastRoll(restarted.loadRollHistory(), a)).toBe(0)
	expect(restarted.getLastRoll(restarted.loadRollHistory(), b)).toBe(200)

	const installed = { id: "builtin:installed" }
	restarted.recordRoll(installed)
	expect(restarted.getLastRoll(restarted.loadRollHistory(), installed)).toBeGreaterThan(0)
	expect(restarted.getLastRoll(restarted.loadRollHistory(), b)).toBe(200)
	expect(restarted.clearAllRolls()).toBe(true)
	vi.resetModules()
	const cleared = await import("./rollHistory")
	expect(cleared.loadRollHistory()).toEqual({})
	expect(onHistoryChange).toHaveBeenCalledOnce()
})

test("starts at zero, counts subsequent rolls across reloads, and preserves the unknown legacy total", async () => {
	let persisted = '{"older":100}'
	vi.stubGlobal("localStorage", {
		getItem: () => persisted,
		setItem: (_key: string, value: string) => { persisted = value },
	})
	const newList = { id: "collection:recent", collectionId: "recent" }
	const older = { id: "collection:older", collectionId: "older" }
	const history = await import("./rollHistory")
	expect(history.getRollStats(history.loadRollHistory(), newList)).toEqual({ count: 0, lastRoll: 0 })
	expect(history.getRollStats(history.loadRollHistory(), older)).toEqual({
		count: 1, lastRoll: 100, countIsMinimum: true,
	})
	history.recordRoll(newList)
	history.recordRoll(older)
	vi.resetModules()
	const restarted = await import("./rollHistory")

	restarted.recordRoll(newList)
	expect(restarted.getRollStats(restarted.loadRollHistory(), newList)).toEqual({
		count: 2, lastRoll: expect.any(Number),
	})
	expect(restarted.getRollStats(restarted.loadRollHistory(), older)).toEqual({
		count: 2, lastRoll: expect.any(Number), countIsMinimum: true,
	})
	expect(restarted.loadRollHistory()).not.toHaveProperty("older")
	expect(restarted.clearRoll(older)).toBe(true)
	expect(restarted.getRollStats(restarted.loadRollHistory(), older)).toEqual({ count: 0, lastRoll: 0 })
	expect(restarted.getRollStats(restarted.loadRollHistory(), newList).count).toBe(2)
})
