import { query } from "entitystorage";
import Request from "../models/request.mjs";

export function queryRequests(req){
  let q = query.type(Request).tag("logrequest");

  // All simple query filters here:
  if(req.path && typeof req.path === "string") q.prop("path", req.path);
  if(req.userId && typeof req.userId === "string") q.prop("userId", req.userId);
  if(req.instance && typeof req.instance === "string") q.prop("instance", req.instance)
  if(req.method && typeof req.method === "string") q.prop("method", req.method)

  // More complex ones here, where data has been retrieved:
  let results = null;

  if(req.pathMatch){
    if(results === null) results = q.all;
    let regExp = new RegExp(req.pathMatch);
    results = results.filter(r => regExp.test(r.path))
  }

  if(req.before){
    if(results === null) results = q.all;
    results = results.filter(r => r.timestamp < req.before)
  }
  if(req.after){
    if(results === null) results = q.all;
    results = results.filter(r => r.timestamp > req.after)
  }

  if(req.users){
    if(results === null) results = q.all;
    results = results.filter(r => req.users.includes(r.userId))
  }
  if(req.paths){
    if(results === null) results = q.all;
    results = results.filter(r => req.paths.includes(r.path))
  }

  // The following is "group by"'s. Must be last.

  if(req.uniqueByUsers){
    if(results === null) results = q.all;
    results = results.filter(r => req.uniqueByUsers.includes(r.userId))
                     .reduce((details, cur) => {
                      if(details.usedUsers.has(cur.userId)) return details;
                      details.result.push(cur);
                      details.usedUsers.add(cur.userId);
                      return details;
                     }, {usedUsers: new Set(), result: []}).result
  }

  let retTypes = Array.isArray(req.return) ? req.return : req.return ? [req.return] : ["requests"]
  let ret = []
  for(let retType of retTypes){
    switch(retType){
      case "paths":
        if(results === null) results = q.all;
        ret.push([...new Set(results.map(r => r.path))])
        break;
      case "users":
        if(results === null) results = q.all;
        ret.push([...new Set(results.map(r => r.userId))])
        break;
      case "count":
        ret.push(results !== null ? results.length : q.count);
        break;
      case "requests":
      default:
        ret.push((results !== null ? results : q.all).map(r => r.toObj()));
        break;
    }
  }
  return Array.isArray(req.return) ? ret : ret.length == 1 ? ret[0] : null
}