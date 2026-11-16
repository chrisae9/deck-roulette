import {
	ButtonItem,
	DialogButton,
	Field,
	Focusable,
	GamepadButton,
	type GamepadEvent,
	PanelSection,
	PanelSectionRow,
	ReorderableEntry,
	ReorderableList,
	SidebarNavigation,
	ToggleField,
} from "@decky/ui"
import { useEffect, useMemo, useRef, useState } from "react"
import { FaChartBar, FaCog, FaFilter, FaThumbtack } from "react-icons/fa"

import {
	createDefaultSettings,
	focusAfterItemRemoval,
	focusAfterReorderSave,
	INSTALLED_SOURCE_ID,
	MY_GAMES_SOURCE_ID,
	reconcilePinnedSourceOrder,
	setCollectionExcluded,
	setSourcePinned,
} from "../collectionSettings"
import {
	availableRouletteSources,
	partitionSourcesByPinned,
	selectableCollections,
} from "../gamePools"
import { sortUnpinnedLists } from "../sortSettings"
import { SETTINGS_ROUTE } from "../routes"
import { SettingsStore } from "../settingsStore"
import { useRollHistory } from "../useRollHistory"
import { useSettingsStore } from "../useSettingsStore"
import { useSteamCollections } from "../useSteamCollections"
import { AdvancedSettings } from "./AdvancedSettings"
import { CollectionSortDropdown } from "./CollectionSortDropdown"
import { moveGamepadFocus } from "./moveGamepadFocus"
import { Stats } from "./Stats"
import { SettingsErrorRow } from "./SettingsErrorRow"
import { SteamLibraryLoading } from "./SteamLibraryLoading"

type SettingsPageProps = {
	store: SettingsStore
}

const PinButton = ({
	pinned,
	label,
	disabled,
	onClick,
	onGamepadDirection,
}: {
	pinned: boolean
	label: string
	disabled: boolean
	onClick: () => void
	onGamepadDirection?: (event: GamepadEvent) => void
}) => (
	<DialogButton
		data-pin-control
		aria-pressed={pinned}
		aria-label={`${pinned ? "Unpin" : "Pin"} ${label}`}
		disabled={disabled}
		onClick={onClick}
		onGamepadDirection={onGamepadDirection}
		onOKActionDescription={pinned ? "Unpin" : "Pin"}
		style={{
			minWidth: "48px",
			width: "48px",
			padding: "10px",
			display: "flex",
			justifyContent: "center",
		}}
	>
		<FaThumbtack
			aria-hidden
			style={{
				color: pinned ? "#1a9fff" : "#b8bcbf",
				opacity: pinned ? 1 : 0.55,
				transform: pinned ? undefined : "rotate(45deg)",
			}}
		/>
	</DialogButton>
)

const ShortcutSettings = ({ store }: SettingsPageProps) => {
	const { settings, loaded, saving, error } = useSettingsStore(store)
	const collectionStore = useSteamCollections(loaded && settings.collectionSortMode === "last-played")
	const rollHistory = useRollHistory()
	const focusTargets = useRef(new Map<string, HTMLDivElement>())
	const pendingFocusSourceId = useRef<string | undefined>(undefined)
	const sortRow = useRef<HTMLDivElement>(null)
	const restoreRow = useRef<HTMLDivElement>(null)
	const availableSources = collectionStore
		? availableRouletteSources(collectionStore, settings.excludedCollectionIds)
		: []
	const { pinnedSources, availableSources: unpinnedSources } =
		partitionSourcesByPinned(
			availableSources,
			settings.pinnedSourceIds
		)
	const availableShortcuts = loaded
		? sortUnpinnedLists(unpinnedSources, settings.collectionSortMode, rollHistory)
		: unpinnedSources
	const shortcutState = useRef({ loaded, pinnedSources })
	shortcutState.current = { loaded, pinnedSources }
	// Decky resets its working order when the entries prop changes identity.
	const [reorderRevision, setReorderRevision] = useState(0)
	const pinnedKey = JSON.stringify(pinnedSources.map(({ id, label }) => [id, label]))
	// Mount the new rows immediately when pins change. Keep the same list
	// instance when only their order changes.
	const pinnedMembership = JSON.stringify(pinnedSources.map(({ id }) => id).sort())
	const reorderEntries = useMemo<ReorderableEntry<string>[]>(() =>
		(JSON.parse(pinnedKey) as [string, string][]).map(([data, label], position) => ({
			label,
			data,
			position,
		})),
		[pinnedKey, reorderRevision]
	)
	const registerFocusTarget =
		(sourceId: string) => (node: HTMLDivElement | null) => {
			if (node) {
				focusTargets.current.set(sourceId, node)
			} else {
				focusTargets.current.delete(sourceId)
			}
		}
	const rememberAdjacentFocus = (sourceIds: string[], sourceId: string) => {
		pendingFocusSourceId.current = focusAfterItemRemoval(sourceIds, sourceId)
	}
	const getPinControl = (sourceId?: string) => sourceId
		? focusTargets.current.get(sourceId)?.querySelector<HTMLButtonElement>("button[data-pin-control]")
		: undefined
	const handleSortDirection = (event: GamepadEvent) => {
		if (event.detail.button === GamepadButton.DIR_UP) {
			moveGamepadFocus(event, getPinControl(pinnedSources[pinnedSources.length - 1]?.id))
		}
		if (event.detail.button === GamepadButton.DIR_DOWN) {
			moveGamepadFocus(event, getPinControl(availableShortcuts[0]?.id))
		}
	}
	const handleAvailableDirection = (event: GamepadEvent, index: number) => {
		if (event.detail.button === GamepadButton.DIR_UP) {
			moveGamepadFocus(event, index === 0
				? sortRow.current?.querySelector("button")
				: getPinControl(availableShortcuts[index - 1]?.id))
		}
		if (event.detail.button === GamepadButton.DIR_DOWN) {
			moveGamepadFocus(event, index === availableShortcuts.length - 1
				? restoreRow.current?.querySelector("button")
				: getPinControl(availableShortcuts[index + 1]?.id))
		}
	}


	useEffect(() => {
		const sourceId = pendingFocusSourceId.current
		if (!sourceId) return

		const focusTarget =
			focusTargets.current.get(sourceId) ??
			focusTargets.current.values().next().value
		const ownerWindow = focusTarget?.ownerDocument.defaultView
		if (!focusTarget || !ownerWindow) return

		const pinButton = focusTarget.querySelector<HTMLElement>("[data-pin-control]")
		const ownerDocument = focusTarget.ownerDocument
		const hasActiveControl = () => {
			const active = ownerDocument.activeElement
			return active && active !== ownerDocument.body &&
				active !== ownerDocument.documentElement && active.isConnected
		}
		if (hasActiveControl()) {
			pendingFocusSourceId.current = undefined
			return
		}

		const timeout = ownerWindow.setTimeout(() => {
			// Native navigation or user input may have restored focus in the meantime.
			if (!hasActiveControl() && pinButton?.isConnected) pinButton.focus()
			pendingFocusSourceId.current = undefined
		}, 50)

		return () => ownerWindow.clearTimeout(timeout)
	}, [saving, settings.pinnedSourceIds])

	const saveOrder = (entries: ReorderableEntry<string>[]) => {
		const orderedSourceIds = entries.flatMap((entry) =>
			entry.data ? [entry.data] : []
		)
		const ownerDocument =
			focusTargets.current.values().next().value?.ownerDocument
		const activeElement = ownerDocument?.activeElement
		const focusedSourceId = orderedSourceIds.find((sourceId) => {
			const target = focusTargets.current.get(sourceId)
			return (
				Boolean(activeElement && target?.contains(activeElement)) ||
				Boolean(target?.querySelector(".gpfocus"))
			)
		})
		pendingFocusSourceId.current = focusAfterReorderSave(
			orderedSourceIds,
			focusedSourceId
		)
		void store.update((currentSettings) => ({
			...currentSettings,
			pinnedSourceIds: reconcilePinnedSourceOrder(
				currentSettings.pinnedSourceIds,
				orderedSourceIds
			),
		})).finally(() => setReorderRevision((revision) => revision + 1))
	}
	// Keep the component type stable so settings updates do not remount focused controls.
	// shortcutState supplies current values without recreating that component type.
	const PinnedControl = useMemo(
		() =>
			({ entry }: { entry: ReorderableEntry<string> }) => {
				const { loaded, pinnedSources } = shortcutState.current
				return (
					<div
						ref={entry.data ? registerFocusTarget(entry.data) : undefined}
						onClick={(event) => event.stopPropagation()}
					>
						<PinButton
							pinned
							label={pinnedSources.find(({ id }) => id === entry.data)?.label ?? "shortcut"}
							disabled={!loaded || !entry.data}
							onClick={() => {
								if (!entry.data) return
								rememberAdjacentFocus(
									pinnedSources.map(({ id }) => id),
									entry.data
								)
								void store.update((currentSettings) =>
									setSourcePinned(currentSettings, entry.data!, false)
								)
							}}
						/>
					</div>
				)
			},
		[store]
	)

	if (!collectionStore) return <SteamLibraryLoading />

	return (
		<div>
			<PanelSection title="Pinned">
				<SettingsErrorRow error={error} loaded={loaded} onRetry={() => void store.load()} />
				{pinnedSources.length > 0 ? (
					<PanelSectionRow>
						<div style={{ width: "100%" }}>
							<ReorderableList
								key={pinnedMembership}
								disableReordering={!loaded || saving}
								entries={reorderEntries}
								interactables={PinnedControl}
								onSave={saveOrder}
							/>
						</div>
					</PanelSectionRow>
				) : (
					<PanelSectionRow>
						<div>No shortcuts are pinned.</div>
					</PanelSectionRow>
				)}
			</PanelSection>
			<PanelSection title="Available">
				{loaded && availableShortcuts.length > 0 && (
					<PanelSectionRow>
						<Focusable style={{ display: "flex", justifyContent: "flex-end", width: "100%" }} ref={sortRow} onGamepadDirection={handleSortDirection}>
							<CollectionSortDropdown
								mode={settings.collectionSortMode}
								onChange={(collectionSortMode) =>
									void store.update((current) => ({ ...current, collectionSortMode }))
								}
							/>
						</Focusable>
					</PanelSectionRow>
				)}
				{availableShortcuts.length > 0 ? (
					availableShortcuts.map((source, index) => (
						<PanelSectionRow key={source.id}>
							<div
								ref={registerFocusTarget(source.id)}
								style={{ width: "100%" }}
							>
								<Field label={source.label}>
									<PinButton
										label={source.label}
										pinned={false}
										disabled={!loaded}
										onGamepadDirection={(event) => handleAvailableDirection(event, index)}
										onClick={() => {
											rememberAdjacentFocus(
												availableShortcuts.map(({ id }) => id),
												source.id
											)
											void store.update((currentSettings) =>
												setSourcePinned(currentSettings, source.id, true)
											)
										}}
									/>
								</Field>
							</div>
						</PanelSectionRow>
					))
				) : (
					<PanelSectionRow>
						<div>Every shortcut is pinned.</div>
					</PanelSectionRow>
				)}
				<PanelSectionRow>
					<Focusable
						ref={restoreRow}
						style={{ width: "100%" }}
						onGamepadDirection={(event) => {
							if (event.detail.button === GamepadButton.DIR_UP) {
								moveGamepadFocus(event, getPinControl(availableShortcuts[availableShortcuts.length - 1]?.id))
							}
						}}
					>
						<ButtonItem
							disabled={!loaded || saving}
							onClick={() =>
								void store.update((currentSettings) => ({
									...currentSettings,
									pinnedSourceIds: createDefaultSettings().pinnedSourceIds,
								}))
							}
						>
							Restore Default Shortcuts
						</ButtonItem>
					</Focusable>
				</PanelSectionRow>
			</PanelSection>
		</div>
	)
}

const ExclusionSettings = ({ store }: SettingsPageProps) => {
	const collectionStore = useSteamCollections()
	const { settings, loaded, saving, error } = useSettingsStore(store)
	if (!collectionStore) return <SteamLibraryLoading />

	const collections = selectableCollections(collectionStore)
	const availableSources = availableRouletteSources(
		collectionStore,
		settings.excludedCollectionIds
	)
	const installedCount =
		availableSources.find((source) => source.id === INSTALLED_SOURCE_ID)
			?.appIds.length ?? 0
	const myGamesCount =
		availableSources.find((source) => source.id === MY_GAMES_SOURCE_ID)
			?.appIds.length ?? 0

	return (
		<div>
			<PanelSection title="Collections">
				<SettingsErrorRow error={error} loaded={loaded} onRetry={() => void store.load()} />
				<PanelSectionRow>
					<div>
						Turn on a collection to skip its games when rolling from Installed
						Games or My Games. Useful for games you've finished or don't play on Deck.
						You can still roll from the collection directly.
						<div style={{ opacity: 0.7, marginTop: "8px" }}>
							Eligible games: Installed {installedCount} · My Games {myGamesCount}
						</div>
					</div>
				</PanelSectionRow>
				{collections.map((collection) => (
					<PanelSectionRow key={collection.id}>
						<ToggleField
							label={collection.displayName}
							checked={settings.excludedCollectionIds.includes(
								collection.id
							)}
							disabled={!loaded}
							onChange={(excluded) =>
								void store.update((currentSettings) =>
									setCollectionExcluded(
										currentSettings,
										collection.id,
										excluded
									)
								)
							}
						/>
					</PanelSectionRow>
				))}
				<PanelSectionRow>
					<ButtonItem
						disabled={
							!loaded ||
							saving ||
							settings.excludedCollectionIds.length === 0
						}
						onClick={() =>
							void store.update((currentSettings) => ({
								...currentSettings,
								excludedCollectionIds: [],
							}))
						}
					>
						Clear Exclusions
					</ButtonItem>
				</PanelSectionRow>
			</PanelSection>
		</div>
	)
}

export const CollectionSettings = ({ store }: SettingsPageProps) => (
	<SidebarNavigation
		pages={[
			{
				title: "Shortcuts",
				content: <ShortcutSettings store={store} />,
				route: `${SETTINGS_ROUTE}/shortcuts`,
				icon: <FaThumbtack />,
			},
			{
				title: "Exclusions",
				content: <ExclusionSettings store={store} />,
				route: `${SETTINGS_ROUTE}/exclusions`,
				icon: <FaFilter />,
			},
			{
				title: "Stats",
				content: <Stats />,
				route: `${SETTINGS_ROUTE}/stats`,
				icon: <FaChartBar />,
			},
			{
				title: "Advanced Settings",
				content: <AdvancedSettings store={store} />,
				route: `${SETTINGS_ROUTE}/advanced`,
				icon: <FaCog />,
			},
		]}
	/>
)
