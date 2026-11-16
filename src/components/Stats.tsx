import {
	ConfirmModal,
	DialogButton,
	Focusable,
	GamepadButton,
	type GamepadEvent,
	PanelSection,
	PanelSectionRow,
	showModal,
} from "@decky/ui"
import { useRef, useState } from "react"
import { FaTrashAlt } from "react-icons/fa"

import { availableRouletteSources, type RouletteSource } from "../gamePools"
import { clearAllRolls, clearRoll, getRollStats } from "../rollHistory"
import { useRollHistory } from "../useRollHistory"
import { useSteamCollections } from "../useSteamCollections"
import { moveGamepadFocus } from "./moveGamepadFocus"
import { SteamLibraryLoading } from "./SteamLibraryLoading"

const rollTime = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

type StatsSource = Pick<RouletteSource, "id" | "kind" | "collectionId" | "label">

export const Stats = () => {
	const collections = useSteamCollections()
	const history = useRollHistory()
	const [storageError, setStorageError] = useState(false)
	const statsRows = useRef(new Map<string, HTMLDivElement>())
	const clearAllRow = useRef<HTMLDivElement>(null)

	const confirmClear = (source?: StatsSource) => {
		showModal(
			<ConfirmModal
				strTitle={source ? "Clear roll history for this list?" : "Clear all stats?"}
				strDescription={source
					? `Reset the roll count and last roll for ${source.label}.`
					: "Reset the roll counts and last rolls for every list."}
				strOKButtonText="Clear"
				strCancelButtonText="Cancel"
				bDestructiveWarning
				onOK={() => setStorageError(!(source ? clearRoll(source) : clearAllRolls()))}
			/>
		)
	}

	if (!collections) return <SteamLibraryLoading />

	const sources = availableRouletteSources(collections, [])
	const clearAllTarget = () => clearAllRow.current?.querySelector<HTMLButtonElement>("button")
	const sourceTarget = (source?: StatsSource) => {
		const row = source && statsRows.current.get(source.id)
		return row ? row.querySelector("button") ?? row : undefined
	}
	const handleDirection = (event: GamepadEvent, index: number) => {
		if (event.detail.button === GamepadButton.DIR_UP) {
			moveGamepadFocus(event, index === 0 ? clearAllTarget() : sourceTarget(sources[index - 1]))
		}
		if (event.detail.button === GamepadButton.DIR_DOWN) {
			moveGamepadFocus(event, sourceTarget(sources[index + 1]))
		}
	}

	const renderRows = (lists: StatsSource[], offset = 0) => lists.map((source, index) => {
		const { id, label } = source
		const { count, lastRoll, countIsMinimum } = getRollStats(history, source)
		const countText = `${count}${countIsMinimum ? "+" : ""} ${count === 1 && !countIsMinimum ? "roll" : "rolls"}`
		return (
			<PanelSectionRow key={id}>
				<Focusable
					data-stats-row={id}
					tabIndex={count ? undefined : 0}
					ref={(node) => {
						if (node) statsRows.current.set(id, node)
						else statsRows.current.delete(id)
					}}
					onGamepadDirection={(event) => handleDirection(event, offset + index)}
					style={{
						display: "grid",
						gridTemplateColumns: "minmax(0, 1fr) max-content 34px",
						alignItems: "center",
						gap: "12px",
						minHeight: "34px",
						width: "100%",
					}}
				>
					<div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
						<div>{label}</div>
						{lastRoll > 0 && (
							<div style={{ fontSize: "12px", opacity: 0.7 }}>
								Last rolled: {rollTime.format(lastRoll)}
							</div>
						)}
					</div>
					<span style={{ opacity: count ? 1 : 0.65, fontVariantNumeric: "tabular-nums" }}>{countText}</span>
					{count > 0 && (
						<DialogButton
							aria-label={`Clear stats for ${label}`}
							onOKActionDescription="Clear stats"
							onClick={() => confirmClear(source)}
							style={{ minWidth: 0, width: "34px", height: "34px", padding: 0 }}
						>
							<FaTrashAlt aria-hidden size={13} />
						</DialogButton>
					)}
				</Focusable>
			</PanelSectionRow>
		)
	})

	const libraryLists = sources.filter(({ kind }) => kind !== "collection")
	const collectionLists = sources.filter(({ kind }) => kind === "collection")
	return (
		<>
			<PanelSection>
				<PanelSectionRow>
					<Focusable
						ref={clearAllRow}
						flow-children="row"
						onGamepadDirection={(event) => {
							if (event.detail.button === GamepadButton.DIR_DOWN) {
								moveGamepadFocus(event, sourceTarget(sources[0]))
							}
						}}
						style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", width: "100%" }}
					>
						<span>Roll counts and last rolls</span>
						<DialogButton
							disabled={Object.keys(history).length === 0}
							onClick={() => confirmClear()}
							style={{ minWidth: 0, width: "auto", padding: "7px 11px", whiteSpace: "nowrap" }}
						>
							Clear All
						</DialogButton>
					</Focusable>
				</PanelSectionRow>
				{storageError && (
					<PanelSectionRow>
						<div role="status">Cleared for this session. Steam couldn’t save the change.</div>
					</PanelSectionRow>
				)}
				{Object.values(history).some(({ countIsMinimum }) => countIsMinimum) && (
					<PanelSectionRow>
						<div style={{ fontSize: "12px", opacity: 0.7 }}>A + marks a minimum. Older versions only saved the last roll.</div>
					</PanelSectionRow>
				)}
			</PanelSection>
			<PanelSection title="Library Lists">{renderRows(libraryLists)}</PanelSection>
			{collectionLists.length > 0 && (
				<PanelSection title="Collections">{renderRows(collectionLists, libraryLists.length)}</PanelSection>
			)}
		</>
	)
}
