import type { RouletteSource } from "./gamePools"

export const SORT_MODES = [
	{ data: "alphabetical", label: "A–Z" },
	{ data: "last-rolled", label: "Last rolled" },
	{ data: "last-played", label: "Last played" },
] as const

export type CollectionSortMode = (typeof SORT_MODES)[number]["data"]
export type RollHistory = Record<string, number>

const HISTORY_KEY = "deck-roulette-roulette-timestamps"

export const parseRollHistory = (saved: string | null): RollHistory => {
	try {
		const parsed: unknown = saved ? JSON.parse(saved) : null
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

		return Object.fromEntries(
			Object.entries(parsed).filter(
				([, value]) => typeof value === "number" && Number.isFinite(value) && value > 0
			)
		)
	} catch {
		return {}
	}
}

export const loadRollHistory = (): RollHistory => {
	try {
		return parseRollHistory(globalThis.localStorage.getItem(HISTORY_KEY))
	} catch {
		return {}
	}
}

export const saveRollHistory = (history: RollHistory) => {
	try {
		globalThis.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
	} catch {
		// Keep the current session's history if Steam's storage is unavailable.
	}
}

type SortableSource = Pick<RouletteSource, "id" | "kind" | "label" | "collectionId" | "lastPlayed">

export const sortUnpinnedLists = <T extends SortableSource>(
	sources: T[],
	mode: CollectionSortMode,
	lastRolls: RollHistory
): T[] => {
	const builtIns = sources.filter(({ kind }) => kind !== "collection")
	const collections = sources.filter(({ kind }) => kind === "collection")

	const recency = (source: SortableSource) => {
		if (mode === "last-played") return source.lastPlayed ?? 0
		if (mode === "last-rolled") {
			// Older builds of the sort fork used the raw Steam collection ID.
			return lastRolls[source.id] ?? lastRolls[source.collectionId ?? ""] ?? 0
		}
		return 0
	}

	collections.sort((left, right) =>
		recency(right) - recency(left) || left.label.localeCompare(right.label)
	)
	return [...builtIns, ...collections]
}
