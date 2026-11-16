import { ButtonItem, ConfirmModal, DialogButton, Field, PanelSection, PanelSectionRow, showModal } from "@decky/ui"
import { useState } from "react"

import { selectableCollections } from "../gamePools"
import { clearAllRolls, clearCollectionRoll, getLastRoll } from "../rollHistory"
import { useRollHistory } from "../useRollHistory"
import { useSteamCollections } from "../useSteamCollections"
import { SteamLibraryLoading } from "./SteamLibraryLoading"

const rollTime = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

export const Stats = () => {
	const collections = useSteamCollections()
	const history = useRollHistory()
	const [storageError, setStorageError] = useState(false)

	const confirmClear = (collection?: { id: string; displayName: string }) => {
		showModal(
			<ConfirmModal
				strTitle={collection ? "Clear collection stats?" : "Clear all stats?"}
				strDescription={collection
					? `Remove the last roll for ${collection.displayName}.`
					: "Remove the saved roll history for every collection."}
				strOKButtonText="Clear"
				strCancelButtonText="Cancel"
				bDestructiveWarning
				onOK={() => setStorageError(!(collection ? clearCollectionRoll(collection.id) : clearAllRolls()))}
			/>
		)
	}

	if (!collections) return <SteamLibraryLoading />

	const entries = selectableCollections(collections)
		.map((collection) => ({ ...collection, lastRoll: getLastRoll(history, collection.id) }))
		.filter(({ lastRoll }) => lastRoll > 0)
		.sort((left, right) => right.lastRoll - left.lastRoll || left.displayName.localeCompare(right.displayName))

	return (
		<PanelSection title="Roll History">
			<PanelSectionRow>
				<div>DeckRoulette saves the most recent roll per collection. Steam play history is separate.</div>
			</PanelSectionRow>
			{storageError && (
				<PanelSectionRow>
					<div role="status">Cleared for this session. Steam couldn’t save the change.</div>
				</PanelSectionRow>
			)}
			{entries.length === 0 && (
				<PanelSectionRow>
					<div>No roll history for your current collections.</div>
				</PanelSectionRow>
			)}
			{entries.map(({ id, displayName, lastRoll }) => (
				<PanelSectionRow key={id}>
					<Field label={displayName} description={`Last rolled: ${rollTime.format(lastRoll)}`}>
						<DialogButton aria-label={`Clear stats for ${displayName}`} onClick={() => confirmClear({ id, displayName })}>
							Clear
						</DialogButton>
					</Field>
				</PanelSectionRow>
			))}
			{Object.keys(history).length > 0 && (
				<PanelSectionRow>
					<ButtonItem onClick={() => confirmClear()}>Clear All Stats</ButtonItem>
				</PanelSectionRow>
			)}
		</PanelSection>
	)
}
