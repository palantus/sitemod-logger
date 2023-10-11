import logger from './routes/logger.mjs';

export default (app, graphQLFields) => {

  logger(app)

  return app
}