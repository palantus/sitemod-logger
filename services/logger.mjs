import LogEntry from "../../../models/logentry.mjs";
import { getTimestamp } from "../../../tools/date.mjs";
import Request from "../models/request.mjs";
import Setup from "../models/setup.mjs";
import CoreSetup from "../../../models/setup.mjs"
import Route from "../models/route.mjs";

let requestCache = [];
let sensitiveProperties = ["token", "password", "email"]

export function storePreAuthInfo(req, res){
  let request = {}
  request.method = req.method;
  request.path = req.path;
  request.timestamp = getTimestamp()

  // Store query
  if(Object.keys(req.query).length > 0){
    request.query = {}
    for(let key of Object.keys(req.query)){
      if(sensitiveProperties.includes(key))
        request.query[key] = "[redacted]";
      else
        request.query[key] = req.query[key];
    }
  }

  // Store body
  if(typeof req.body === "object" && Object.keys(req.body).length > 0){
    request.body = {}
    for(let key of Object.keys(req.body)){
      if(sensitiveProperties.includes(key))
        request.body[key] = "[redacted]";
      else if(typeof req.body[key] === "string" && req.body[key].length > 100 && req.path != "/graphql")
        request.body[key] = req.body[key].substring(0, 94) + " [...]";
      else
        request.body[key] = req.body[key];
    }
  }

  requestCache.push(request);
  res.locals.loggerRequest = request;
}
export function storePostAuthInfo(req, res){
  res.locals.loggerRequest.userId = res.locals.user.id;
}
export function startService(){
  return setInterval(runJob, 10_000);
}

async function runJob(){
  if(requestCache.length < 1) return;
  let setup = Setup.lookup();
  if(!setup.saveLocal){
    requestCache = []
    return;
  }

  let count = requestCache.length > 100 ? 100 : requestCache.length;
  let requests = Route.filterRequests(requestCache.slice(0, count));

  let destination = setup.destination;
  if(destination){
    try{
      await destination.post("logger/requests/log", {
        origin: Route.serializeOriginInfo(), 
        requests
      });
      requestCache = requestCache.slice(count)
    } catch(err){
      new LogEntry(`Failed to send logs to remote. Will attempt again next time and not clear cache. Error: ${JSON.stringify(err)}`, "logger")
      return;
    }
  } else {
    for(let entry of requests){
      let request = new Request()
      for(let key of Object.keys(entry)){
        if(key == "id" || key == "_id") continue;
        request[key] = entry[key];
      }
      request.instance = "local";
    }
    requestCache = requestCache.slice(count)
  }

  if(count == 100){
    new LogEntry("Sent 100 requests this time. Will send the next batch asap.", "logger")
    setTimeout(runJob, 100);
  }
}
