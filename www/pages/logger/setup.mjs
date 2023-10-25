const elementName = 'logger-setup-page'
import {on, off} from "../../system/events.mjs"
import api from "../../system/api.mjs"
import "../../components/field-edit.mjs"
import "../../components/collapsible-card.mjs"
import "../../components/field-edit-inline.mjs"
import "../../components/field-ref.mjs"
import "../../components/context-menu.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import {showDialog} from "../../components/dialog.mjs"
import Toast from "../../components/toast.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
      padding: 10px;
    }
    collapsible-card > div{
      padding: 10px;
    }
    collapsible-card{
      margin-bottom: 10px;
      display: block;
    }
    #routes-tab tbody td{padding-top: 5px;padding-bottom:5px;}
  </style>  

  <action-bar>
      <action-bar-item id="cleanup-btn">Clean-up</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>Logger setup</h1>

    <p>If you want to log to another instance (or forward log), set up a federation remote and choose it here:</p>
    Destination: <field-edit lookup="federation-remote" type="select" id="destination"></field-edit>

    <p>If you want to store a log of requests made to this instance, check the following checkbox. If you have chosen a destination above, the log will be sent to that instance - otherwise it will be stored locally.</p>
    Save local requests: <field-edit type="checkbox" id="saveLocal"></field-edit>

    <br><br>

    <collapsible-card open>
      <span slot="title">Routes</span>
      <div>
        <p>Setup which routes to log. The default is to log, so any request not matching a route, is logged. Note that if log entries are being forwarded, both this instance and the destination checks them against their respective routes.</p>
        <table id="routes-tab">
          <thead>
              <tr class="result">
                <th>Idx</th>
                <th>Path</th>
                <th>Role</th>
                <th>Method</th>
                <th>Action</th>
                <th></th>
              </tr>
          </thead>
          <tbody id="routes" class="container">
          </tbody>
        </table>
        <button class="styled" id="new-route-btn">Add route</button>
      </div>
    </collapsible-card>

    <collapsible-card open>
      <span slot="title">Live stream</span>
      <div>
        <p>The following is the last 15 log records stored (ie. those that conforms to the routes above):</p>
        <table id="stream-tab">
          <thead>
              <tr class="result">
                <th>Timestamp</th>
                <th>Method</th>
                <th>Path</th>
                <th>User</th>
                <th>Instance</th>
              </tr>
          </thead>
          <tbody id="stream" class="container">
          </tbody>
        </table>
      </div>
    </collapsible-card>
  </div>

  <dialog-component title="Cleanup" id="cleanup-dialog">
    <p>Cleanup is only done for the instance that you are on now (ie. those requests that originally was for this instance). If you want to cleanup for another instance, you need to go to that one and execute a cleanup.</p>
    <br>
    <h2>Cleanup by routes</h2>
    <label for="cleanup-routes">Delete everything that doesn't match routes</label>
    <input type="checkbox" id="cleanup-routes"></input>
    <p>Note that this will forward routes to the destination server (if any) to aid in cleaning up</p>
    <br><br>
    <h2>Cleanup by date</h2>
    <label for="cleanup-date">Delete everything older than</label>
    <input id="cleanup-date" type="date"></input>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.newRoute = this.newRoute.bind(this)
    this.refreshStream = this.refreshStream.bind(this)
    this.cleanup = this.cleanup.bind(this)

    this.shadowRoot.getElementById("new-route-btn").addEventListener("click", this.newRoute)
    this.shadowRoot.getElementById("cleanup-btn").addEventListener("click", this.cleanup)

    this.shadowRoot.getElementById("routes").addEventListener("item-clicked", e => {
      let id = e.detail.menu.closest("tr.route")?.getAttribute("data-id")
      if(!id) return;
      switch(e.detail.button){
        case "delete":
          api.del(`logger/routes/${id}`).then(this.refreshData);
          break;
      }
    })
  }

  async refreshData(){
    let setup = await api.get("logger/setup")

    this.shadowRoot.getElementById("destination").setAttribute("value", setup.destination||"")
    this.shadowRoot.getElementById("saveLocal").setAttribute("value", !!setup.saveLocal)

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `logger/setup`));


    let routes = this.routes = await api.get("logger/routes")

    this.shadowRoot.getElementById("routes").innerHTML = routes.sort((a,b) => a.orderIdx < b.orderIdx ? -1 : 1).map(r => `
      <tr data-id="${r.id}" class="route result">
        <td><field-edit-inline type="number" patch="logger/routes/${r.id}" field="orderIdx" value="${r.orderIdx}"></field-edit-inline></td>
        <td><field-edit-inline type="text" patch="logger/routes/${r.id}" field="path" value="${r.path||""}"></field-edit-inline></td>
        <td><field-edit-inline type="text" patch="logger/routes/${r.id}" field="role" value="${r.role||""}"></field-edit-inline></td>
        <td>
          <field-edit-inline type="select" patch="logger/routes/${r.id}" field="method" value="${r.method||""}">
            <option value="">All</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="OPTION">OPTION</option>
          </field-edit-inline>
        </td>
        <td>
          <field-edit-inline type="select" patch="logger/routes/${r.id}" field="action" value="${r.action||""}">
            <option value="log">Log request and stop</option>
            <option value="ignore">Stop (don't log)</option>
            <option value="nothing">Nothing</option>
          </field-edit-inline>
        </td>
        <td>
          <context-menu width="150px">
            <span data-button="delete">Delete route</span>
          </context-menu>
        </td>
      </tr>
    `).join("")
  }

  async newRoute(){
    await api.post(`logger/routes`, {})
    this.refreshData()
  }

  async refreshStream(){
    let log = await api.post("logger/requests/query", {last: 15})
    log.reverse()
    this.shadowRoot.getElementById("stream").innerHTML = log.map(r => `
      <tr class="result">
        <td>${r.timestamp.replace("T", " ").substring(0, 19)}</td>
        <td>${r.method}</td>
        <td>${r.path}</td>
        <td>${r.userId||""}</td>
        <td>${r.instance||""}</td>
      </tr>
      `).join("")
  }
  async cleanup(){
    let dialog = this.shadowRoot.querySelector("#cleanup-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.getElementById("cleanup-routes").focus(),
      ok: async (val) => {
        await api.post("logger/requests/cleanup", val)
        new Toast({text: "Cleanup done"});
      },
      values: () => {return {
        notMatchingRoutes: this.shadowRoot.getElementById("cleanup-routes").checked,
        olderThanDate: this.shadowRoot.getElementById("cleanup-date").value
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  connectedCallback() {
    on("changed-page", elementName, this.refreshData)
    this.streamInterval = setInterval(this.refreshStream, 2000);
    setTimeout(this.refreshStream, 20);
  }

  disconnectedCallback() {
    off("changed-page", elementName)
    clearInterval(this.streamInterval)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}