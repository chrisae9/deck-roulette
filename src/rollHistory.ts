export type RollStats = Readonly<{
	count: number
	lastRoll: number
	countIsMinimum?: true
}>

export type RollHistory = Readonly<Record<string, RollStats>>

const EMPTY_STATS: RollStats = { count: 0, lastRoll: 0 }
const validTimestamp = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 8.64e15

const HISTORY_KEY = "deck-roulette-roulette-timestamps"
const listeners = new Set<() => void>()
let sessionRollHistory: RollHistory | undefined

export const parseRollHistory = (saved: string | null): RollHistory => {
	try {
		const parsed: unknown = saved ? JSON.parse(saved) : null
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

		const entries: Array<[string, RollStats]> = []
		for (const [key, value] of Object.entries(parsed)) {
			if (validTimestamp(value)) {
				// Older builds remembered only the last roll. One is a lower bound.
				entries.push([key, { count: 1, lastRoll: value, countIsMinimum: true }])
			} else if (value && typeof value === "object" &&
				Number.isSafeInteger(value.count) && value.count > 0 &&
				validTimestamp(value.lastRoll)) {
				entries.push([key, {
					count: value.count,
					lastRoll: value.lastRoll,
					...(value.countIsMinimum === true ? { countIsMinimum: true } : {}),
				}])
			}
		}
		return Object.fromEntries(entries)
	} catch {
		return {}
	}
}

export const loadRollHistory = (): RollHistory => {
	if (!sessionRollHistory) {
		try {
			sessionRollHistory = parseRollHistory(globalThis.localStorage.getItem(HISTORY_KEY))
		} catch {
			sessionRollHistory = {}
		}
	}
	return sessionRollHistory
}

export const subscribeToRollHistory = (listener: () => void) => {
	listeners.add(listener)
	return () => { listeners.delete(listener) }
}

export const saveRollHistory = (history: RollHistory) => {
	sessionRollHistory = history
	let persisted = true
	try {
		globalThis.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
	} catch {
		// Keep roll history usable during this Steam session if storage is unavailable.
		persisted = false
	}
	listeners.forEach((listener) => listener())
	return persisted
}

type RollSource = { id: string; collectionId?: string }

export const getRollStats = (history: RollHistory, source: RollSource): RollStats => {
	// Sort-fork builds saved timestamps with the raw collection ID.
	const read = (key: string) => Object.prototype.hasOwnProperty.call(history, key)
		? history[key]
		: undefined
	return read(source.id) ?? (source.collectionId ? read(source.collectionId) : undefined) ?? EMPTY_STATS
}

export const getLastRoll = (history: RollHistory, source: RollSource) =>
	getRollStats(history, source).lastRoll

export const recordRoll = (source: RollSource) => {
	const history = { ...loadRollHistory() }
	const previous = getRollStats(history, source)
	if (source.collectionId) delete history[source.collectionId]
	history[source.id] = {
		...previous,
		count: Math.min(previous.count + 1, Number.MAX_SAFE_INTEGER),
		lastRoll: Date.now(),
	}
	saveRollHistory(history)
}

export const clearRoll = ({ id, collectionId }: RollSource) => {
	const history = { ...loadRollHistory() }
	delete history[id]
	if (collectionId) delete history[collectionId]
	return saveRollHistory(history)
}

export const clearAllRolls = () => saveRollHistory({})
