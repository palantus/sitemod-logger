import Role from "../../models/role.mjs"
import { startService } from "./services/logger.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("admin").addPermission(["logger.read", "logger.setup", "logger.edit"], true)

  return {
    loggerService: startService()
  }
}