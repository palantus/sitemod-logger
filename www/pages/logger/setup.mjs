const elementName = 'logger-setup-page'
import {on, off} from "/system/events.mjs"
import api from "/system/api.mjs"
import "/components/field-edit.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{
      padding: 10px;
    }
  </style>  

  <div id="container">
    <h1>Logger setup</h1>

    <p>If you want to log to another instance (or forward log), set up a federation remote and choose it here:</p>
    Destination: <field-edit lookup="federation-remote" type="select" id="destination"></field-edit>

    <p>If you want to store a log of requests made to this instance, check the following checkbox. If you have chosen a destination above, the log will be sent to that instance - otherwise it will be stored locally.</p>
    Save local requests: <field-edit type="checkbox" id="saveLocal"></field-edit>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
  }

  async refreshData(){
    let setup = await api.get("logger/setup")

    this.shadowRoot.getElementById("destination").setAttribute("value", setup.destination||"")
    this.shadowRoot.getElementById("saveLocal").setAttribute("value", !!setup.saveLocal)

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `logger/setup`));
  }

  connectedCallback() {
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}