import type { OfficeSlice } from "@/store/slices/officeSlice"
import type { ProviderSlice } from "@/store/slices/providerSlice"
import type { MissionSlice } from "@/store/slices/missionSlice"

export type OfficeStore = OfficeSlice & ProviderSlice & MissionSlice
