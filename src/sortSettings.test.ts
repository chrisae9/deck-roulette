import { describe, expect, test, vi } from "vitest"

import { INSTALLED_SOURCE_ID, MY_GAMES_SOURCE_ID } from "./collectionSettings"
import { partitionSourcesByPinned, type RouletteSource } from "./gamePools"
import { loadRollHistory, parseRollHistory, saveRollHistory } from "./rollHistory"
import { sortUnpinnedLists } from "./sortSettings"

const source = (id: string, label: string, lastPlayed?: number): RouletteSource => ({
	id: `collection:${id}`,
	kind: "collection",
	label,
	collectionId: id,
	appIds: [42],
	lastPlayed,
})

describe("Quick Access sorting", () => {
	const alpha = source("a", "Alpha", 200)
	const bravo = source("b", "Bravo")
	const zulu = source("z", "Zulu", 100)
	const installed: RouletteSource = {
		id: INSTALLED_SOURCE_ID, kind: "installed", label: "Installed Games", appIds: [],
	}
	const myGames: RouletteSource = {
		id: MY_GAMES_SOURCE_ID, kind: "my-games", label: "My Games", appIds: [],
	}
	const sources = [installed, myGames, zulu, bravo, alpha]

	test("sorts only browse results while shortcuts keep their manual order", () => {
		const { pinnedSources, availableSources } = partitionSourcesByPinned(
			sources,
			[zulu.id, installed.id]
		)

		expect(sortUnpinnedLists(availableSources, "alphabetical", {}))
			.toEqual([myGames, alpha, bravo])
		expect(pinnedSources).toEqual([zulu, installed])
		expect(availableSources).toEqual([myGames, bravo, alpha])
	})

	test("sorts by roll history, recognizes the fork's raw IDs, and uses A–Z for ties", () => {
		const history = parseRollHistory('{"z":300,"collection:a":100,"b":100,"bad":"600"}')
		expect(history).not.toHaveProperty("bad")
		expect(sortUnpinnedLists(sources, "last-rolled", history))
			.toEqual([installed, myGames, zulu, alpha, bravo])
	})

	test("remembers a roll across Quick Access mounts when storage rejects a write", () => {
		vi.stubGlobal("localStorage", {
			getItem: () => '{"collection:a":100}',
			setItem: () => { throw new Error("Storage is full") },
		})

		try {
			const history = loadRollHistory()
			expect(sortUnpinnedLists(sources, "last-rolled", history)[2]).toBe(alpha)
			saveRollHistory({ ...history, [zulu.id]: 200 })

			const reopenedHistory = loadRollHistory()
			expect(reopenedHistory[alpha.id]).toBe(100)
			expect(sortUnpinnedLists(sources, "last-rolled", reopenedHistory)[2]).toBe(zulu)
		} finally {
			vi.unstubAllGlobals()
		}
	})

	test("last played uses Steam play times; never-played collections follow", () => {
		expect(sortUnpinnedLists(sources, "last-played", { [bravo.id]: 500 }))
			.toEqual([installed, myGames, alpha, zulu, bravo])
	})
})
