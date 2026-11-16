export const HIDDEN_STEAM_COLLECTION_IDS = ["local-install", "uncategorized"]

export type SteamCollectionSnapshot = {
	id: string
	displayName: string
	visibleApps: Pick<SteamAppOverview, "appid">[]
	lastPlayed?: number
}

export type SteamCollectionsSnapshot = {
	userCollections: SteamCollectionSnapshot[]
	localGamesCollection: SteamCollectionSnapshot
	myGamesCollection: SteamCollectionSnapshot
	deckDesktopApps?: SteamCollectionSnapshot
}

const readPlayTime = (app: SteamAppOverview) => {
	try {
		const time = app.rt_last_time_played
		return Number.isFinite(time) ? time : 0
	} catch {
		// Play history is optional; a missing value must not block a roll.
		return 0
	}
}

const readCollection = (
	collection: SteamCollection | undefined,
	includeLastPlayed = false
): SteamCollectionSnapshot | undefined => {
	if (!collection) return undefined

	const { id, displayName, visibleApps } = collection
	if (!Array.isArray(visibleApps)) return undefined

	let lastPlayed = 0
	const apps = visibleApps.map((app) => {
		if (includeLastPlayed) lastPlayed = Math.max(lastPlayed, readPlayTime(app))
		return { appid: app.appid }
	})

	return {
		id,
		displayName,
		visibleApps: apps,
		...(includeLastPlayed ? { lastPlayed } : {}),
	}
}

export const readSteamCollections = (
	store?: CollectionStore,
	includeLastPlayed = false
): SteamCollectionsSnapshot | undefined => {
	try {
		if (!store) return undefined

		// Steam's getters can throw before the library finishes initializing.
		const {
			userCollections,
			localGamesCollection,
			myGamesCollection,
			deckDesktopApps,
		} = store
		if (!Array.isArray(userCollections)) return undefined

		const installed = readCollection(localGamesCollection)
		const myGames = readCollection(myGamesCollection)
		const desktopApps = readCollection(deckDesktopApps)
		if (!installed || !myGames || (deckDesktopApps && !desktopApps)) return undefined

		const collections: SteamCollectionSnapshot[] = []
		for (const collection of userCollections) {
			if (HIDDEN_STEAM_COLLECTION_IDS.includes(collection.id)) continue
			const snapshot = readCollection(collection, includeLastPlayed)
			if (!snapshot) return undefined
			collections.push(snapshot)
		}

		return {
			userCollections: collections,
			localGamesCollection: installed,
			myGamesCollection: myGames,
			deckDesktopApps: desktopApps,
		}
	} catch {
		return undefined
	}
}
