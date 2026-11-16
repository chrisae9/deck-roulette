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
					label="YOLO Mode"
					description="Launch installed picks right away. Other picks still open their game page."
					checked={settings.yoloMode}
					disabled={!loaded}
					onChange={(yoloMode) =>
						void store.update((currentSettings) => ({
							...currentSettings,
							yoloMode,
						}))
					}
				/>
			</PanelSectionRow>
		</PanelSection>
	)
}
