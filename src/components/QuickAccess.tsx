import {
	ButtonItem,
	DropdownItem,
	Focusable,
	Navigation,
	NavEntryPositionPreferences,
	PanelSection,
	PanelSectionRow,
} from "@decky/ui"
import { ReactNode, RefObject, useEffect, useRef, useState } from "react"

import {
	availableRouletteSources,
	partitionSourcesByPinned,
	type RouletteSource,
	selectableCollections,
} from "../gamePools"
import { SETTINGS_ROUTE } from "../routes"
import { SettingsStore } from "../settingsStore"
import { useSettingsStore } from "../useSettingsStore"
import { useSteamCollections } from "../useSteamCollections"
import {
	BROWSE_FOCUS_ID,
	focusableSourceIds,
	OTHER_LISTS_BACK_FOCUS_ID,
	resolveMainFocus,
	resolveOtherListsFocus,
	SETTINGS_FOCUS_ID,
} from "../quickAccessFocus"
import {
	loadRollHistory,
	saveRollHistory,
	SORT_MODES,
	sortUnpinnedLists,
} from "../sortSettings"
import { navigateToRandomGame } from "../utils"
import { SettingsErrorRow } from "./SettingsErrorRow"
import { SteamLibraryLoading } from "./SteamLibraryLoading"

type QuickAccessProps = {
	store: SettingsStore
}

type FocusTargetProps = {
	children: ReactNode
	focusRef: RefObject<HTMLDivElement | null>
	preferred: boolean
}

const FocusTarget = ({ children, focusRef, preferred }: FocusTargetProps) => (
	<div ref={preferred ? focusRef : undefined} style={{ width: "100%" }}>
		{children}
	</div>
)

let quickAccessView: "shortcuts" | "other-lists" = "shortcuts"
let lastSelectedOtherSourceId: string | undefined
let lastMainFocusId: string | undefined

export const QuickAccess = ({ store }: QuickAccessProps) => {
	const { settings, loaded, saving, error } = useSettingsStore(store)
	const sortEnabled = loaded && settings.showSortButton
	const [browsingOtherLists, setBrowsingOtherLists] = useState(
		quickAccessView === "other-lists"
	)
	const collectionStore = useSteamCollections(
		browsingOtherLists && sortEnabled && settings.collectionSortMode === "last-played"
	)
	const libraryReady = collectionStore !== undefined
	const [rollHistory, setRollHistory] = useState(loadRollHistory)
	const panelRoot = useRef<HTMLDivElement>(null)
	const preferredFocusTarget = useRef<HTMLDivElement>(null)
	const collections = collectionStore ? selectableCollections(collectionStore) : []
	const availableSources = collectionStore
		? availableRouletteSources(collectionStore, settings.excludedCollectionIds)
		: []
	const { pinnedSources, availableSources: unpinnedSources } =
		partitionSourcesByPinned(availableSources, settings.pinnedSourceIds)
	// Direct collection rolls do not depend on settings. Keep broad rolls
	// disabled until we can apply the saved exclusions.
	const settingsUnavailable = !loaded && Boolean(error)
	const otherSources = settingsUnavailable
		? availableSources.filter(({ kind }) => kind === "collection")
		: browsingOtherLists && sortEnabled
			? sortUnpinnedLists(unpinnedSources, settings.collectionSortMode, rollHistory)
			: unpinnedSources
	const canBrowse = (loaded || settingsUnavailable) && otherSources.length > 0
	const canRoll = ({ kind, appIds }: RouletteSource) =>
		appIds.length > 0 && (loaded || (settingsUnavailable && kind === "collection"))
	const knownCollectionIds = new Set(
		collections.map((collection) => collection.id)
	)
	const excludedCount = settings.excludedCollectionIds.filter((id) =>
		knownCollectionIds.has(id)
	).length
	const preferredMainFocusId = resolveMainFocus(
		focusableSourceIds(pinnedSources.filter(canRoll)),
		canBrowse,
		lastMainFocusId
	)
	const preferredOtherFocusId = resolveOtherListsFocus(
		focusableSourceIds(otherSources.filter(canRoll)),
		lastSelectedOtherSourceId,
		// A sort change must not move gamepad focus from the dropdown into the reordered rows.
		sortEnabled
	)

	useEffect(() => {
		if ((!loaded && !settingsUnavailable) || !libraryReady) return

		const root = panelRoot.current
		const ownerWindow = root?.ownerDocument.defaultView
		if (!root || !ownerWindow) return

		let timeout: number | undefined
		const focusPreferredButton = () => {
			if (timeout !== undefined) ownerWindow.clearTimeout(timeout)
			timeout = ownerWindow.setTimeout(() => {
				const target = preferredFocusTarget.current
				target?.querySelector<HTMLElement>("button")?.focus()
			}, 50)
		}
		const observer = new ownerWindow.IntersectionObserver((entries) => {
			if (entries.some(({ isIntersecting }) => isIntersecting)) {
				focusPreferredButton()
			}
		})
		observer.observe(root)
		if (root.getClientRects().length > 0) focusPreferredButton()

		return () => {
			observer.disconnect()
			if (timeout !== undefined) ownerWindow.clearTimeout(timeout)
		}
	}, [browsingOtherLists, libraryReady, loaded, settingsUnavailable, preferredMainFocusId, preferredOtherFocusId])

	const openSettings = () => {
		lastMainFocusId = undefined
		Navigation.Navigate(`${SETTINGS_ROUTE}/shortcuts`)
		Navigation.CloseSideMenus()
	}
	const showOtherLists = () => {
		lastMainFocusId = undefined
		quickAccessView = "other-lists"
		setBrowsingOtherLists(true)
	}
	const showShortcuts = () => {
		lastMainFocusId = undefined
		quickAccessView = "shortcuts"
		setBrowsingOtherLists(false)
	}
	const openRandomGame = (source: RouletteSource) => {
		if (!canRoll(source)) return

		if (browsingOtherLists) {
			lastSelectedOtherSourceId = source.id
		} else {
			lastMainFocusId = source.id
		}
		navigateToRandomGame(source.appIds)
		if (sortEnabled && source.kind === "collection") {
			const history = { ...rollHistory, [source.id]: Date.now() }
			setRollHistory(history)
			saveRollHistory(history)
		}
	}
	const sourceLabel = ({ label, appIds }: RouletteSource) =>
		settings.showGameCounts ? `${label} (${appIds.length})` : label

	if (!collectionStore) return <SteamLibraryLoading />

	if (browsingOtherLists) {
		return (
			<div ref={panelRoot}>
				<Focusable
					key="other-lists"
					navEntryPreferPosition={NavEntryPositionPreferences.FIRST}
				>
					<PanelSection title="Other Game Lists">
					<SettingsErrorRow error={error} loaded={loaded} onRetry={() => void store.load()} />
					<PanelSectionRow>
						<FocusTarget
							focusRef={preferredFocusTarget}
							preferred={
								preferredOtherFocusId === OTHER_LISTS_BACK_FOCUS_ID
							}
						>
							<ButtonItem
								{...({
									preferredFocus:
										preferredOtherFocusId === OTHER_LISTS_BACK_FOCUS_ID,
								} as any)}
								layout="below"
								onClick={showShortcuts}
							>
								← Back to Shortcuts
							</ButtonItem>
						</FocusTarget>
					</PanelSectionRow>
					{sortEnabled ? (
						<PanelSectionRow>
							<DropdownItem
								label="Sort by"
								menuLabel="Sort collections"
								rgOptions={[...SORT_MODES]}
								selectedOption={settings.collectionSortMode}
								disabled={!loaded}
								onChange={({ data }) => {
									const mode = SORT_MODES.find((option) => option.data === data)?.data
									if (!mode) return
									void store.update((current) => ({ ...current, collectionSortMode: mode }))
								}}
							/>
						</PanelSectionRow>
					) : null}
					{otherSources.map((source) => (
						<PanelSectionRow key={source.id}>
							<FocusTarget
								focusRef={preferredFocusTarget}
								preferred={source.id === preferredOtherFocusId}
							>
								<ButtonItem
									{...({
										preferredFocus:
											source.id === preferredOtherFocusId,
									} as any)}
									layout="below"
									disabled={!canRoll(source)}
									onClick={() => openRandomGame(source)}
								>
									{sourceLabel(source)}
								</ButtonItem>
							</FocusTarget>
						</PanelSectionRow>
					))}
					</PanelSection>
				</Focusable>
			</div>
		)
	}

	return (
		<div ref={panelRoot}>
			<Focusable
				key="shortcuts"
				navEntryPreferPosition={NavEntryPositionPreferences.FIRST}
			>
				<PanelSection title="Random Game">
				{pinnedSources.map((source) => (
					<PanelSectionRow key={source.id}>
						<FocusTarget
							focusRef={preferredFocusTarget}
							preferred={source.id === preferredMainFocusId}
						>
							<ButtonItem
								{...({
									preferredFocus: source.id === preferredMainFocusId,
								} as any)}
								layout="below"
								disabled={!canRoll(source)}
								description={
									loaded && source.appIds.length === 0
										? "No eligible games in this list."
										: undefined
								}
								onClick={() => openRandomGame(source)}
							>
								{sourceLabel(source)}
							</ButtonItem>
						</FocusTarget>
					</PanelSectionRow>
				))}
				{otherSources.length > 0 ? (
					<PanelSectionRow>
						<FocusTarget
							focusRef={preferredFocusTarget}
							preferred={preferredMainFocusId === BROWSE_FOCUS_ID}
						>
							<ButtonItem
								{...({
									preferredFocus:
										preferredMainFocusId === BROWSE_FOCUS_ID,
								} as any)}
								layout="below"
								disabled={!canBrowse}
								description={settingsUnavailable ? undefined : `${otherSources.length} unpinned lists`}
								onClick={showOtherLists}
							>
								Browse Other Lists…
							</ButtonItem>
						</FocusTarget>
					</PanelSectionRow>
				) : null}
				</PanelSection>
				<PanelSection title="Settings">
				<SettingsErrorRow error={error} loaded={loaded} onRetry={() => void store.load()} />
				<PanelSectionRow>
					<FocusTarget
						focusRef={preferredFocusTarget}
						preferred={preferredMainFocusId === SETTINGS_FOCUS_ID}
					>
						<ButtonItem
							{...({
								preferredFocus:
									preferredMainFocusId === SETTINGS_FOCUS_ID,
							} as any)}
							layout="below"
							disabled={saving}
							description={`${pinnedSources.length} pinned · ${excludedCount} excluded`}
							onClick={openSettings}
						>
							Advanced Settings
						</ButtonItem>
					</FocusTarget>
				</PanelSectionRow>
				</PanelSection>
			</Focusable>
		</div>
	)
}
