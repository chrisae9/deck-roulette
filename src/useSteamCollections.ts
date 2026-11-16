import { useEffect, useState } from "react"

import { readSteamCollections } from "./steamCollections"

export const useSteamCollections = (includeLastPlayed = false) => {
	const [, setRetry] = useState(0)
	const steamWindow = window as Window & { collectionStore?: CollectionStore }
	const collections = readSteamCollections(steamWindow.collectionStore, includeLastPlayed)
	const ready = collections !== undefined

	useEffect(() => {
		if (ready) return

		const timer = setInterval(() => setRetry((retry) => retry + 1), 1000)
		return () => clearInterval(timer)
	}, [ready])

	return collections
}
