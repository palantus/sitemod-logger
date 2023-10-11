import { storePostAuthInfo } from "../services/logger.mjs";

export default (app) => {
  app.all('*', (req, res, next) => {
    storePostAuthInfo(req, res)
    next();
  });
}
