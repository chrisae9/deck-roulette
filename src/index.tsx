import {
	ButtonItem,
	PanelSection,
	PanelSectionRow,
	staticClasses,
} from "@decky/ui"
import { definePlugin } from "@decky/api"
import { GiPerspectiveDiceSixFacesRandom } from "react-icons/gi"

import { useSteamCollections } from "./useSteamCollections"
import { navigateToRandomGame } from "./utils"

const DeckRoulette = () => {
	const collections = useSteamCollections()

	if (!collections) {
		return (
			<PanelSection title="Random Game">
				<PanelSectionRow>Waiting for Steam's library…</PanelSectionRow>
			</PanelSection>
		)
	}

	const { localGamesCollection, myGamesCollection, deckDesktopApps, userCollections } =
		collections
	const installedAppIds = Array.from(
		new Set(
			[
				...localGamesCollection.visibleApps,
				...(deckDesktopApps?.visibleApps ?? []),
			].map((app) => app.appid)
		)
	)

	return (
		<div>
			<PanelSection title="Random Game">
				<PanelSectionRow>
					<ButtonItem
						layout="below"
						onClick={() => navigateToRandomGame(installedAppIds)}
					>
						{localGamesCollection.displayName} ({installedAppIds.length})
					</ButtonItem>
				</PanelSectionRow>
				<PanelSectionRow>
					<ButtonItem
						layout="below"
						onClick={() =>
							navigateToRandomGame(
								myGamesCollection.visibleApps.map((app) => app.appid)
							)
						}
					>
						{myGamesCollection.displayName} ({myGamesCollection.visibleApps.length})
					</ButtonItem>
				</PanelSectionRow>
			</PanelSection>
			<PanelSection title="Steam Collections">
				{userCollections.map((collection) => (
					<PanelSectionRow key={collection.id}>
						<ButtonItem
							layout="below"
							onClick={() =>
								navigateToRandomGame(
									collection.visibleApps.map((app) => app.appid)
								)
							}
						>
							{collection.displayName} ({collection.visibleApps.length})
						</ButtonItem>
					</PanelSectionRow>
				))}
			</PanelSection>
		</div>
	)
}

export default definePlugin(() => {
	return {
		name: "DeckRoulette",
		titleView: <div className={staticClasses.Title}>DeckRoulette</div>,
		content: <DeckRoulette />,
		icon: <GiPerspectiveDiceSixFacesRandom />,
		onDismount() {},
	}
})
