import { message } from './constants.js';
import BaseWebComponent from './WebComponentLibrary.js'

console.log(`Message from the world: ${message}`);

export class ExampleElement extends BaseWebComponent
{
    constructor() {
        super(`
        h2 {
            color: green; 
        }
        `, `<h2>If you see this, it works!</h2>`);
    }
    connectedCallback() {
        if(this.isConnected) {
            setTimeout(() => this.render(`<h4>The text should now be smaller, and black.</h4>`), 1000)
        }
    }
    disconnectedCallback() {
        // Delete the element from DOM to see this get triggered.
        alert('The element got removed from the DOM.');
    }
}
customElements.define('depinore-example', ExampleElement);