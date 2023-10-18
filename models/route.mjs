import Entity, {query, nextNum}  from "entitystorage"
import User from "../../../models/user.mjs";

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
    if(obj.role !== undefined) this.roleId = typeof obj.role === "string" ? obj.role : null;
    if(obj.action !== undefined) this.action = typeof obj.action === "string" ? obj.action : "log";
    return this;
  }

  static filterRequests(requests){
    return requests.filter(r => Route.shouldLogRequest(r));
  }

  static shouldLogRequest(req){
    for(let route of Route.allSorted()){
      if(!route.isRouteValidForRequest(req)) continue;
      return route.action == "log" ? true : false;
    }
    return true;
  }

  isRouteValidForRequest(req){
    if(this.action == "nothing") return false;
    try{
      if(this.path && this.path != req.path && !new RegExp(this.path).test(req.path)) return false;
    } catch(err){
      return false;
    }
    if(this.roleId && (!req.userId || !User.lookup(req.userId)?.roles.includes(this.roleId))) return false;
    return true;
  }

  toObj(){
    return {
      id: this.id,
      orderIdx: this.orderIdx,
      method: this.method || null,
      path: this.path || null,
      role: this.roleId || null,
      action: this.action
    }
  }
}