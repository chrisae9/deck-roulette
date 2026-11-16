import { PanelSection, PanelSectionRow, ToggleField } from "@decky/ui"

import { SettingsStore } from "../settingsStore"
import { useSettingsStore } from "../useSettingsStore"
import { SettingsErrorRow } from "./SettingsErrorRow"

export const AdvancedSettings = ({ store }: { store: SettingsStore }) => {
	const { settings, loaded, error } = useSettingsStore(store)

	return (
		<PanelSection>
			<SettingsErrorRow error={error} loaded={loaded} onRetry={() => void store.load()} />
			<PanelSectionRow>
				<ToggleField
					label="Show Game Counts"
					description="Show the number of eligible games next to each list."
					checked={settings.showGameCounts}
					disabled={!loaded}
					onChange={(showGameCounts) =>
						void store.update((currentSettings) => ({
							...currentSettings,
							showGameCounts,
						}))
					}
				/>
			</PanelSectionRow>
			<PanelSectionRow>
				<ToggleField
					label="Show Sort Button"
					description="Add a sort control to Browse Other Lists in Quick Access. Pinned shortcuts keep their order."
					checked={settings.showSortButton}
					disabled={!loaded}
					onChange={(showSortButton) =>
						void store.update((currentSettings) => ({
							...currentSettings,
							showSortButton,
						}))
					}
				/>
			</PanelSectionRow>
		</PanelSection>
	)
}
