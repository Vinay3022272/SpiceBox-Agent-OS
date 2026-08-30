import MerchantWikiModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const MERCHANT_WIKI_MODULE = "merchantWikiModuleService"

export default Module(MERCHANT_WIKI_MODULE, {
  service: MerchantWikiModuleService,
})
