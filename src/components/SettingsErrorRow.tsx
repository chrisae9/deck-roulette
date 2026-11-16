import { ButtonItem, PanelSectionRow } from "@decky/ui"

type SettingsErrorRowProps = {
	error?: string
	loaded: boolean
	onRetry: () => void
}

export const SettingsErrorRow = ({ error, loaded, onRetry }: SettingsErrorRowProps) => {
	if (!error) return null

	return (
		<PanelSectionRow>
			{loaded ? (
				<div>{error}</div>
			) : (
				<ButtonItem layout="below" description={error} onClick={onRetry}>
					Retry Settings
				</ButtonItem>
			)}
		</PanelSectionRow>
	)
}
