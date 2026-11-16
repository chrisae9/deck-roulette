import { PanelSection, PanelSectionRow, ToggleField } from "@decky/ui"

import { SettingsStore } from "../settingsStore"
import { useSettingsStore } from "../useSettingsStore"
import { SettingsErrorRow } from "./SettingsErrorRow"

export const AdvancedSettings = ({ store }: { store: SettingsStore }) => {
	const { settings, loaded, error } = useSettingsStore(store)

	return (
		<PanelSection title="Advanced Settings">
			<SettingsErrorRow error={error} loaded={loaded} onRetry={() => void store.load()} />
			<PanelSectionRow>
				<ToggleField
					label="Show Game Counts"
					description="Show how many games each list can pick from in Quick Access."
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
		</PanelSection>
	)
}
