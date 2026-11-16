export type RollHistory = Readonly<Record<string, number>>

const HISTORY_KEY = "deck-roulette-roulette-timestamps"
const listeners = new Set<() => void>()
let sessionRollHistory: RollHistory | undefined

export const parseRollHistory = (saved: string | null): RollHistory => {
	try {
		const parsed: unknown = saved ? JSON.parse(saved) : null
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

		return Object.fromEntries(
			Object.entries(parsed).filter(
				([, value]) => typeof value === "number" && Number.isFinite(value) &&
					value > 0 && value <= 8.64e15
			)
		)
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

const normalizedId = (collectionId: string) => `collection:${collectionId}`

export const getLastRoll = (history: RollHistory, collectionId: string) => {
	// Sort-fork builds saved timestamps with the raw collection ID.
	const read = (key: string) => Object.prototype.hasOwnProperty.call(history, key)
		? history[key]
		: 0
	return read(normalizedId(collectionId)) || read(collectionId)
}

export const recordCollectionRoll = (collectionId: string) => {
	saveRollHistory({ ...loadRollHistory(), [normalizedId(collectionId)]: Date.now() })
}

export const clearCollectionRoll = (collectionId: string) => {
	const history = { ...loadRollHistory() }
	delete history[normalizedId(collectionId)]
	delete history[collectionId]
	return saveRollHistory(history)
}

export const clearAllRolls = () => saveRollHistory({})
