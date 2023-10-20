import Entity, {query}  from "entitystorage"
import Route from "./route.mjs";

class Request extends Entity {

  initNew() {
    this.tag("logrequest")
  }

  static lookup(id){
    return query.type(Request).id(id).tag("logrequest").first
  }

  static all(){
    return query.type(Request).tag("logrequest").all
  }

  static allByInstance(instanceName){
    return query.type(Request).tag("logrequest").prop("instance", instanceName).all
  }

  static cleanup({notMatchingRoutes, olderThanDate, routeSetups} = {}){
    let routeSetupsAll;
    reqloop: for(let req of Request.allByInstance(routeSetups?.[0]?.identifier||"local")){
      if(olderThanDate && olderThanDate > req.timestamp) {
        req.delete();
        continue reqloop;
      }
      if(notMatchingRoutes){
        if(!routeSetupsAll){
          routeSetupsAll = routeSetups || []
          routeSetupsAll.push(Route.serializeLocalRoutes())
        }
        setupLoop: for(let routeSetup of routeSetupsAll){
          routeLoop: for(let route of routeSetup.routes){
            if(!Route.isRouteValidForRequest(req, routeSetup, route)) continue routeLoop;
            if(route.action == "log") continue setupLoop;
            else {
              req.delete();
              continue reqloop;
            }
          }
        }
      }
    }
  }

  toObj(){
    return {
      id: this._id,
      timestamp: this.timestamp,
      method: this.method,
      path: this.path,
      userId: this.userId,
      instance: this.instance
    }
  }
}

export default Request