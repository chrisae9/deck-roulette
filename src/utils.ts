import { Router } from "decky-frontend-lib"

export const EXCLUDE_COLLECTION_IDS = ["local-install", "uncategorized"]

export const randomIndex = (max: number) => Math.floor(Math.random() * max)

export const navigateToRandomGame = (appIds: number[]) => {
	if (appIds.length === 0) return

	const randomAppId = appIds[randomIndex(appIds.length)]
	Router.Navigate(`/library/app/${randomAppId}`)
	Router.CloseSideMenus()
}
