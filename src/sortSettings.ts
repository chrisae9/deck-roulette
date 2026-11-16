import type { RouletteSource } from "./gamePools"
import { getLastRoll, type RollHistory } from "./rollHistory"

export const SORT_MODES = [
	{ data: "alphabetical", label: "A–Z" },
	{ data: "last-rolled", label: "Last rolled" },
	{ data: "last-played", label: "Last played" },
] as const

export type CollectionSortMode = (typeof SORT_MODES)[number]["data"]

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
			return getLastRoll(lastRolls, source)
		}
		return 0
	}

	collections.sort((left, right) =>
		recency(right) - recency(left) || left.label.localeCompare(right.label)
	)
	return [...builtIns, ...collections]
}
