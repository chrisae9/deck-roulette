import { useSyncExternalStore } from "react"

import { loadRollHistory, subscribeToRollHistory } from "./rollHistory"

export const useRollHistory = () =>
	useSyncExternalStore(subscribeToRollHistory, loadRollHistory)
