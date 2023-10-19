import Entity, {query, nextNum}  from "entitystorage"
import User from "../../../models/user.mjs";
import CoreSetup from "../../../models/setup.mjs"
import Role from "../../../models/role.mjs";

export default class Route extends Entity {

  initNew() {
    this.id = nextNum("loggerroute")
    this.orderIdx = (Route.all().sort((a, b) => a.orderIdx < b.orderIdx ? 1 : -1)?.[0]?.orderIdx || 0) + 1;
    this.action = "log"
    this.tag("loggerroute")
  }

  static lookup(id){
    return query.type(Route).prop("id", id).tag("loggerroute").first
  }

  static all(){
    return query.type(Route).tag("loggerroute").all
  }

  static allSorted(){
    return query.type(Route).tag("loggerroute").all.sort((a, b) => a.orderIdx < b.orderIdx ? -1 : 1)
  }

  patch(obj){
    if(obj.orderIdx !== undefined && !isNaN(obj.orderIdx)) this.orderIdx = obj.orderIdx;
    if(obj.method !== undefined) this.method = typeof obj.method === "string" ? obj.method : null;
    if(obj.path !== undefined) this.path = typeof obj.path === "string" ? obj.path : null;
    if(obj.role !== undefined) this.role = typeof obj.role === "string" ? obj.role : null;
    if(obj.action !== undefined) this.action = typeof obj.action === "string" ? obj.action : "log";
    return this;
  }

  static filterRequests(requests, origin){
    return requests.filter(r => Route.shouldLogRequest(r, origin));
  }

  static shouldLogRequest(req, origin){
    for(let route of Route.allSorted()){
      if(!Route.isRouteValidForRequest(req, origin, route)) continue;
      return route.action == "log" ? true : false;
    }
    return true;
  }

  static isRouteValidForRequest(req, origin, route){
    if(route.action == "nothing") return false;
    try{
      if(route.path && route.path != req.path && !new RegExp(route.path).test(req.path)) return false;
    } catch(err){
      return false;
    }
    if(route.role){
      if(!req.userId) return false;
      if(origin?.roles && !origin.roles.find(r => r.id == route.role)?.users.includes(req.userId)) return false;
      else if(!origin?.roles && !User.lookup(req.userId)?.roles.includes(route.role)) return false;
    }
    if(route.method && req.method != route.method) return false;
    return true;
  }

  static serializeLocalRoutes(){
    return {
      identifier: CoreSetup.lookup().identifier,
      roles: Role.all().map(r => ({id: r.id, users: r.members.map(u => u.id)})),
      routes: Route.allSorted().map(r => r.toObj())
    }
  }

  static serializeOriginInfo(){
    return {
      identifier: CoreSetup.lookup().identifier || null,
      roles: Role.all().map(r => ({id: r.id, users: r.members.map(u => u.id)}))
    }
  }

  toObj(){
    return {
      id: this.id,
      orderIdx: this.orderIdx,
      method: this.method || null,
      path: this.path || null,
      role: this.role || null,
      action: this.action
    }
  }
}