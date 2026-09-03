import { ExecArgs } from "@medusajs/framework/types"

export default async function setupStore({ container }: ExecArgs) {
  console.log("--------------------------------------------------")
  console.log("INITIALIZING STORE INFRASTRUCTURE & REGIONS")
  console.log("--------------------------------------------------")

  const pgConnection = container.resolve("__pg_connection__")
  const storeModule = container.resolve("store")
  const regionModule = container.resolve("region")
  const salesChannelModule = container.resolve("sales_channel")

  // 1. Configure Store
  const [store] = await storeModule.listStores()
  if (store) {
    await storeModule.updateStores(store.id, {
      name: "SpiceBox Apparel & Wearables",
      supported_currencies: [
        { currency_code: "inr", is_default: true },
        { currency_code: "usd" },
        { currency_code: "eur" },
      ],
    })
    console.log("✔ Configured Store: SpiceBox Apparel & Wearables (Currencies: INR, USD, EUR)")
  }

  // 2. Configure Sales Channel
  let [salesChannel] = await salesChannelModule.listSalesChannels({
    name: "Default Sales Channel",
  })
  if (!salesChannel) {
    salesChannel = await salesChannelModule.createSalesChannels({
      name: "Default Sales Channel",
      description: "Default store web sales channel",
    })
  }
  console.log("✔ Active Sales Channel:", salesChannel.id)

  // 3. Link Publishable Key to Sales Channel
  const [apiKey] = await pgConnection.raw(`
    SELECT id, token FROM api_key WHERE type = 'publishable' LIMIT 1;
  `).then((res: any) => res.rows)

  if (apiKey) {
    const [existingLink] = await pgConnection.raw(`
      SELECT * FROM publishable_api_key_sales_channel 
      WHERE publishable_key_id = ? AND sales_channel_id = ?
    `, [apiKey.id, salesChannel.id]).then((res: any) => res.rows)

    if (!existingLink) {
      await pgConnection.raw(`
        INSERT INTO publishable_api_key_sales_channel 
        (id, publishable_key_id, sales_channel_id, created_at, updated_at)
        VALUES ('pksc_' || substr(md5(random()::text), 1, 26), ?, ?, now(), now());
      `, [apiKey.id, salesChannel.id])
    }
    console.log("✔ Linked Publishable API Key:", apiKey.token)
  }

  // 4. Configure Regions (India, US, Europe)
  // Ensure India
  let [indiaRegion] = await regionModule.listRegions({ currency_code: "inr" })
  if (!indiaRegion) {
    indiaRegion = await regionModule.createRegions({
      name: "India",
      currency_code: "inr",
      countries: ["in"],
    })
  } else {
    // Ensure country "in" is assigned to India region
    await pgConnection.raw(`
      UPDATE region_country SET region_id = ?, deleted_at = NULL WHERE iso_2 = 'in';
    `, [indiaRegion.id])
  }
  console.log("✔ Region Configured: India (in, INR) ->", indiaRegion.id)

  // Ensure United States
  let [usRegion] = await regionModule.listRegions({ currency_code: "usd" })
  if (!usRegion) {
    usRegion = await regionModule.createRegions({
      name: "United States",
      currency_code: "usd",
      countries: ["us"],
    })
  } else {
    await pgConnection.raw(`
      UPDATE region_country SET region_id = ?, deleted_at = NULL WHERE iso_2 = 'us';
    `, [usRegion.id])
  }
  console.log("✔ Region Configured: United States (us, USD) ->", usRegion.id)

  // Ensure Europe
  let [euRegion] = await regionModule.listRegions({ currency_code: "eur" })
  if (!euRegion) {
    euRegion = await regionModule.createRegions({
      name: "Europe",
      currency_code: "eur",
      countries: ["de", "fr", "it", "es", "dk"],
    })
  } else {
    await pgConnection.raw(`
      UPDATE region_country SET region_id = ?, deleted_at = NULL WHERE iso_2 IN ('de', 'fr', 'it', 'es', 'dk');
    `, [euRegion.id])
  }
  console.log("✔ Region Configured: Europe (EUR) ->", euRegion.id)

  console.log("--------------------------------------------------")
  console.log("STORE SETUP COMPLETE!")
  console.log("--------------------------------------------------")
}
