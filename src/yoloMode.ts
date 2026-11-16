const LIBRARY_DETAILS_LAUNCH_SOURCE = 100

export const launchInstalledGame = (
	appId: number,
	installedAppIds: ReadonlySet<number>
) => {
	if (!installedAppIds.has(appId)) return

	try {
		const overview = window.appStore?.GetAppOverviewByAppID?.(appId) as
			| Pick<SteamAppOverview, "gameid" | "m_gameid">
			| undefined
			| null
		// Non-Steam shortcuts use a 64-bit game ID, so keep Steam's string intact.
		const gameId = overview?.gameid || overview?.m_gameid
		if (typeof gameId === "number" && !Number.isSafeInteger(gameId)) return
		if (gameId != null && !/^[1-9][0-9]*$/.test(String(gameId))) return
		if (gameId == null && (appId <= 0 || appId > 0x7fffffff)) return
		window.SteamClient?.Apps?.RunGame(
			String(gameId ?? appId),
			"",
			-1,
			LIBRARY_DETAILS_LAUNCH_SOURCE
		)
	} catch (error) {
		console.error("DeckRoulette could not launch the game", error)
	}
}
