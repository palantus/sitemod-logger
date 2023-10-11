import Request from "../models/request.mjs";
import { storePreAuthInfo } from "../services/logger.mjs";

export default (app) => {
  app.all('*', (req, res, next) => {
    storePreAuthInfo(req, res);
    next();
  });
}
