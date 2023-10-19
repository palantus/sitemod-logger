import Entity, {query}  from "entitystorage"

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