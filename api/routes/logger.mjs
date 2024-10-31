import express from "express"
import Setup from "../../models/setup.mjs";
import {lookupType, permission} from "../../../../services/auth.mjs"
import Request from "../../models/request.mjs";
import APIKey from "../../../../models/apikey.mjs";
import { queryRequests } from "../../services/query.mjs";
import Route from "../../models/route.mjs";
const { Router } = express;
const route = Router();

export default (app) => {

  const route = Router();
  app.use("/logger", route)

  route.post('/requests/log', permission("logger.edit"), (req, res, next) => {
    let setup = Setup.lookup();
    let destination = setup.destination;

    let origin = {
      identifier: req.body.origin?.identifier
                    || APIKey.lookup(res.locals.authMethod?.apiKey?._id)?.identifier  // No idea why this lookup is needed, but it fails without
                    || "unknown",
      roles: req.body.origin?.roles||null
    }

    let requests = Route.filterRequests(req.body.requests, origin);

    if(destination){
      destination.post(`logger/requests/log`, {origin, requests}).then(result => res.json(result)).catch(err => {
        res.status(500);
        res.json({error: "Could not forward to logger destination"})
      })
    } else {
      for(let entry of requests){
        let request = new Request()
        for(let key of Object.keys(entry)){
          if(key == "id" || key == "_id") continue;
          request[key] = entry[key];
        }
        request.instance = origin.identifier
      }
      res.json({success: true})
    }
  });

  route.post('/requests/query', permission("logger.read"), (req, res, next) => {
    let setup = Setup.lookup();
    let destination = setup.destination;
    if(destination){
      destination.post(`logger/requests/query`, req.body).then(result => res.json(result)).catch(err => {
        res.status(500);
        res.json({error: "Could not forward to logger destination"})
      })
    } else {
      if(Array.isArray(req.body))
        res.json(req.body.map(queryRequests))
      else
        res.json(queryRequests(req.body))
    }
  });

  route.post('/requests/cleanup', permission("logger.edit"), (req, res, next) => {
    let setup = Setup.lookup();
    let destination = setup.destination;
    if(destination){
      let info = JSON.parse(JSON.stringify(req.body));
      if(info.routeSetups) info.routeSetups.push(Route.serializeLocalRoutes())
      else info.routeSetups = [Route.serializeLocalRoutes()];
      destination.post(`logger/requests/cleanup`, info).then(result => res.json(result)).catch(err => {
        res.status(500);
        res.json({error: "Could not forward to logger destination"})
      })
    } else {
      Request.cleanup(req.body)
      res.json({success: true})
    }
  });

  route.get('/request/:id', permission("logger.read"), (req, res) => {
    let setup = Setup.lookup();
    let destination = setup.destination;
    if(destination){
      destination.get(`logger/request/${req.params.id}`).then(details => {
        res.json(details);
      })
    } else {
      let request = Request.lookup(req.params.id);
      res.json({...request.toObj(), body: request.body, query: request.query})
    }
  });

  route.get('/setup', permission("logger.read"), (req, res, next) => {
    res.json(Setup.lookup().toObj())
  });

  route.patch('/setup', permission("logger.edit"), (req, res, next) => {
    res.json(Setup.lookup().patch(req.body).toObj())
  });

  /* Routes */

  route.get('/routes', permission("logger.edit"), (req, res) => {
    res.json(Route.all().map(r => r.toObj()))
  });

  route.post('/routes', permission("logger.edit"), (req, res) => {
    res.json(new Route().patch(req.body).toObj())
  });

  route.patch('/routes/:id', permission("logger.edit"), lookupType(Route, "route"), (req, res) => {
    res.json(res.locals.route.patch(req.body).toObj())
  });

  route.delete('/routes/:id', permission("logger.edit"), lookupType(Route, "route"), (req, res) => {
    res.locals.route?.delete();
    res.json({success: true});
  });
};
