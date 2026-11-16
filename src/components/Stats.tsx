import { ButtonItem, ConfirmModal, DialogButton, Field, PanelSection, PanelSectionRow, showModal } from "@decky/ui"
import { useState } from "react"

import { availableRouletteSources, type RouletteSource } from "../gamePools"
import { clearAllRolls, clearRoll, getLastRoll } from "../rollHistory"
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

	const confirmClear = (source?: Pick<RouletteSource, "id" | "collectionId" | "label">) => {
		showModal(
			<ConfirmModal
				strTitle={source ? "Clear roll history for this list?" : "Clear all stats?"}
				strDescription={source
					? `Remove the last roll for ${source.label}.`
					: "Remove the saved roll history for every list."}
				strOKButtonText="Clear"
				strCancelButtonText="Cancel"
				bDestructiveWarning
				onOK={() => setStorageError(!(source ? clearRoll(source) : clearAllRolls()))}
			/>
		)
	}

	if (!collections) return <SteamLibraryLoading />

	const entries = availableRouletteSources(collections, [])
		.map(({ id, collectionId, label }) => ({
			id, collectionId, label, lastRoll: getLastRoll(history, { id, collectionId }),
		}))
		.filter(({ lastRoll }) => lastRoll > 0)
		.sort((left, right) => right.lastRoll - left.lastRoll || left.label.localeCompare(right.label))

	return (
		<PanelSection title="Roll History">
			<PanelSectionRow>
				<div>DeckRoulette saves the most recent roll for each list. Steam play history is separate.</div>
			</PanelSectionRow>
			{storageError && (
				<PanelSectionRow>
					<div role="status">Cleared for this session. Steam couldn’t save the change.</div>
				</PanelSectionRow>
			)}
			{entries.length === 0 && (
				<PanelSectionRow>
					<div>No rolls recorded yet.</div>
				</PanelSectionRow>
			)}
			{entries.map(({ id, collectionId, label, lastRoll }) => (
				<PanelSectionRow key={id}>
					<Field label={label} description={`Last rolled: ${rollTime.format(lastRoll)}`}>
						<DialogButton aria-label={`Clear stats for ${label}`} onClick={() => confirmClear({ id, collectionId, label })}>
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
