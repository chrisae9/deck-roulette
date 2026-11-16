import {
	ButtonItem,
	DialogButton,
	Field,
	PanelSection,
	PanelSectionRow,
	ReorderableEntry,
	ReorderableList,
	SidebarNavigation,
	ToggleField,
} from "@decky/ui"
import { useEffect, useMemo, useRef } from "react"
import { FaFilter, FaThumbtack } from "react-icons/fa"

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
import { SETTINGS_ROUTE } from "../routes"
import { SettingsStore } from "../settingsStore"
import { useSettingsStore } from "../useSettingsStore"
import { useSteamCollections } from "../useSteamCollections"
import { SteamLibraryLoading } from "./SteamLibraryLoading"

type SettingsPageProps = {
	store: SettingsStore
}

const ErrorRow = ({ error }: { error?: string }) =>
	error ? (
		<PanelSectionRow>
			<div>{error}</div>
		</PanelSectionRow>
	) : null

const PinButton = ({
	pinned,
	label,
	disabled,
	onClick,
}: {
	pinned: boolean
	label: string
	disabled: boolean
	onClick: () => void
}) => (
	<DialogButton
		data-pin-control
		aria-pressed={pinned}
		aria-label={`${pinned ? "Unpin" : "Pin"} ${label}`}
		disabled={disabled}
		onClick={onClick}
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
	const collectionStore = useSteamCollections()
	const { settings, loaded, saving, error } = useSettingsStore(store)
	const focusTargets = useRef(new Map<string, HTMLDivElement>())
	const pendingFocusSourceId = useRef<string | undefined>(undefined)
	const availableSources = collectionStore
		? availableRouletteSources(collectionStore, settings.excludedCollectionIds)
		: []
	const { pinnedSources, availableSources: availableShortcuts } =
		partitionSourcesByPinned(
			availableSources,
			settings.pinnedSourceIds
		)
	const shortcutState = useRef({ loaded, pinnedSources })
	shortcutState.current = { loaded, pinnedSources }
	const reorderEntries: ReorderableEntry<string>[] = pinnedSources.map(
		(source, position) => ({
			label: source.label,
			data: source.id,
			position,
		})
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
		}))
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
			<PanelSection title="Pinned Shortcuts">
				<ErrorRow error={error} />
				{pinnedSources.length > 0 ? (
					<PanelSectionRow>
						<div style={{ width: "100%" }}>
							<ReorderableList
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
			<PanelSection title="Available Shortcuts">
				{availableShortcuts.length > 0 ? (
					availableShortcuts.map((source) => (
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
					<ButtonItem
						disabled={!loaded || saving}
						onClick={() =>
							void store.update((currentSettings) => ({
								...currentSettings,
								pinnedSourceIds:
									createDefaultSettings().pinnedSourceIds,
							}))
						}
					>
						Restore Default Shortcuts
					</ButtonItem>
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
			<PanelSection title="Collection Exclusions">
				<ErrorRow error={error} />
				<PanelSectionRow>
					<div>
						Turn on a collection to skip its games when rolling from Installed
						Games or My Games. You can still roll from that collection directly.
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
		]}
	/>
)
