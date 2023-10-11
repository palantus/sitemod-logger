import express from "express"
import Setup from "../../models/setup.mjs";
import {permission} from "../../../../services/auth.mjs"
import Request from "../../models/request.mjs";
import APIKey from "../../../../models/apikey.mjs";
import { queryRequests } from "../../services/query.mjs";
const { Router } = express;
const route = Router();

export default (app) => {

  const route = Router();
  app.use("/logger", route)

  route.post('/requests/log', permission("logger.edit"), (req, res, next) => {
    let setup = Setup.lookup();
    let destination = setup.destination;

    let instance = req.body.instance
                || APIKey.lookup(res.locals.authMethod?.apiKey?._id)?.identifier  // No idea why this lookup is needed, but it fails without
                || "unknown";

    if(destination){
      destination.post(`logger/requests/log`, {instance, requests: req.body.requests}).then(result => res.json(result)).catch(err => null)
    } else {
      for(let entry of req.body.requests){
        let request = new Request()
        for(let key of Object.keys(entry)){
          if(key == "id" || key == "_id") continue;
          request[key] = entry[key];
        }
        request.instance = instance
      }
      res.json({success: true})
    }
  });

  route.post('/requests/query', permission("logger.read"), (req, res, next) => {
    let setup = Setup.lookup();
    let destination = setup.destination;
    if(destination){
      destination.post(`logger/requests/query`, req.body).then(result => res.json(result)).catch(err => null)
    } else {
      if(Array.isArray(req.body))
        res.json(req.body.map(queryRequests))
      else
        res.json(queryRequests(req.body))
    }
  });

  route.get('/setup', permission("logger.read"), (req, res, next) => {
    res.json(Setup.lookup().toObj())
  });

  route.patch('/setup', permission("logger.edit"), (req, res, next) => {
    res.json(Setup.lookup().patch(req.body).toObj())
  });
};