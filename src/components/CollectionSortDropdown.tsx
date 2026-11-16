import { Dropdown } from "@decky/ui"
import { FaSortAmountDown } from "react-icons/fa"

import { type CollectionSortMode, SORT_MODES } from "../sortSettings"

export const CollectionSortDropdown = ({ mode, onChange }: {
	mode: CollectionSortMode
	onChange: (mode: CollectionSortMode) => void
}) => (
	<div role="group" aria-label="Collection sort order" style={{ width: "172px", maxWidth: "100%", flexShrink: 0 }}>
		<Dropdown
			menuLabel="Sort collections"
			rgOptions={[...SORT_MODES]}
			selectedOption={mode}
			onChange={({ data }) => {
				const choice = SORT_MODES.find((option) => option.data === data)
				if (choice) onChange(choice.data)
			}}
			renderButtonValue={(label) => (
				<span style={{ display: "flex", alignItems: "center", gap: "7px", whiteSpace: "nowrap" }}>
					<FaSortAmountDown aria-hidden style={{ flexShrink: 0 }} />
					{label}
				</span>
			)}
		/>
	</div>
)
