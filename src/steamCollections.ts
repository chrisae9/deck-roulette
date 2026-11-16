const HIDDEN_STEAM_COLLECTION_IDS = ["local-install", "uncategorized"]

export type SteamCollectionSnapshot = {
	id: string
	displayName: string
	visibleApps: Pick<SteamAppOverview, "appid">[]
}

export type SteamCollectionsSnapshot = {
	userCollections: SteamCollectionSnapshot[]
	localGamesCollection: SteamCollectionSnapshot
	myGamesCollection: SteamCollectionSnapshot
	deckDesktopApps?: SteamCollectionSnapshot
}

const readCollection = (
	collection: SteamCollection | undefined
): SteamCollectionSnapshot | undefined => {
	if (!collection) return undefined

	const { id, displayName, visibleApps } = collection
	if (!Array.isArray(visibleApps)) return undefined

	return {
		id,
		displayName,
		visibleApps: visibleApps.map(({ appid }) => ({ appid })),
	}
}

export const readSteamCollections = (
	store?: CollectionStore
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
			const snapshot = readCollection(collection)
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
