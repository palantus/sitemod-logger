import Entity, {query}  from "entitystorage"
import Remote from "../../../models/remote.mjs"

class Setup extends Entity {

  initNew() {
    this.tag("logger-setup")
  }

  patch(obj){
    if(obj.destination !== undefined){
      this.rel(!isNaN(obj.destination) ? Remote.lookup(parseInt(obj.destination)) : null, "destination", true);
    }
    if(typeof obj.saveLocal === "boolean") {
      this.saveLocal = obj.saveLocal;
    }
    return this;
  }

  static lookup(id){
    return query.type(Setup).tag("logger-setup").first || new Setup()
  }

  get destination(){
    return Remote.from(this.related.destination) || null
  }

  toObj(){
    return {
      destination: this.destination?.id||null,
      saveLocal: !!this.saveLocal
    }
  }
}

export default Setup