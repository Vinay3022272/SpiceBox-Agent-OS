"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"

export const listRegions = async (): Promise<HttpTypes.StoreRegion[]> => {
  return await sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      cache: "no-store",
    })
    .then(({ regions }) => regions || [])
    .catch(() => [])
}

export const retrieveRegion = async (id: string): Promise<HttpTypes.StoreRegion | null> => {
  return await sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      cache: "no-store",
    })
    .then(({ region }) => region)
    .catch(() => null)
}

let regionMap = new Map<string, HttpTypes.StoreRegion>()
let lastUpdated = 0

export const getRegion = async (countryCode: string): Promise<HttpTypes.StoreRegion | null> => {
  const now = Date.now()

  // Refresh cache if stale or if country code not cached yet
  if (!regionMap.has(countryCode.toLowerCase()) || now - lastUpdated > 30000) {
    const regions = await listRegions()

    if (!regions || regions.length === 0) {
      return null
    }

    regionMap.clear()
    regions.forEach((region) => {
      region.countries?.forEach((c) => {
        if (c?.iso_2) {
          regionMap.set(c.iso_2.toLowerCase(), region)
        }
      })
    })
    lastUpdated = now
  }

  // Look up country code, or fallback to the first available region in the store
  const region =
    regionMap.get(countryCode.toLowerCase()) ||
    regionMap.values().next().value ||
    null

  return region
}
