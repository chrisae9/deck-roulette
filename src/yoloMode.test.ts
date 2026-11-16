import { afterEach, describe, expect, test, vi } from "vitest"

import { launchInstalledGame } from "./yoloMode"

const withSteam = (overview: { m_gameid?: string | number; gameid?: string } | null) => {
	const RunGame = vi.fn()
	const GetAppOverviewByAppID = vi.fn(() => overview)
	vi.stubGlobal("window", {
		SteamClient: { Apps: { RunGame } },
		appStore: { GetAppOverviewByAppID },
	})
	return { RunGame, GetAppOverviewByAppID }
}

afterEach(() => vi.unstubAllGlobals())

describe("YOLO Mode", () => {
	test("never calls Steam's launcher for a pick outside the installed set", () => {
		const { RunGame, GetAppOverviewByAppID } = withSteam({ gameid: "42" })
		launchInstalledGame(42, new Set([43]))
		expect(GetAppOverviewByAppID).not.toHaveBeenCalled()
		expect(RunGame).not.toHaveBeenCalled()
	})

	test("launches a Steam pick by app ID when the overview is missing", () => {
		const { RunGame } = withSteam(null)
		launchInstalledGame(42, new Set([42]))
		expect(RunGame).toHaveBeenCalledWith("42", "", -1, 100)
	})

	test("passes a non-Steam shortcut's full game ID without losing precision", () => {
		const { RunGame } = withSteam({ m_gameid: "15275591684014424064" })
		const shortcutId = 3_556_625_983
		launchInstalledGame(shortcutId, new Set([shortcutId]))
		expect(RunGame).toHaveBeenCalledWith("15275591684014424064", "", -1, 100)
	})

	test("does not launch a shortcut without a reliable game ID", () => {
		const { RunGame } = withSteam(null)
		const shortcutId = 3_556_625_983
		launchInstalledGame(shortcutId, new Set([shortcutId]))
		expect(RunGame).not.toHaveBeenCalled()
	})
})
