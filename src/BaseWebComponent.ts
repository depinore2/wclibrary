import purify from 'dompurify'
import * as he from 'he'
import { minViewportWidths } from './constants';
import { FormFactor } from './types'

export abstract class BaseWebComponent extends HTMLElement {
    disconnectionCallbacks: { [id: number]: Function | undefined } = {};
    currentFormFactor: FormFactor = 'mobile';

    mobileMediaQueryList = window.matchMedia(`(max-width: ${minViewportWidths.tablet - 1}px)`);
    tabletMediaQueryList = window.matchMedia(`(min-width: ${minViewportWidths.tablet}px) and (max-width: ${minViewportWidths.desktop - 1}px)`);
    desktopMediaQueryList = window.matchMedia(`(min-width: ${minViewportWidths.desktop}px)`);

    callbackCounter = 0
    
    constructor(styles: string, initialContent: string = '') {
        super();

        this.attachShadow({ mode: 'open' });

        const styleTag = document.createElement('style');
        styleTag.appendChild(document.createTextNode(styles));

        const contentTag = document.createElement('div');
        contentTag.setAttribute('id', 'content');
        contentTag.innerHTML = initialContent;

        if (this.shadowRoot !== null) {
            this.shadowRoot.appendChild(styleTag);
            this.shadowRoot.appendChild(contentTag);
        }
        else
            throw new Error('ShadowRoot did not initialize properly.');
    }

    // === HTML RENDERING ===

    // prefer to use template() instead, as it's safer and simpler to use.
    protected render(content: string, selector: string = ''): void {
        if (this.shadowRoot) {
            const contentRoot = this.shadowRoot.querySelector('#content');

            if (contentRoot === null)
                throw new Error('Content root (#content) unexpectedly missing from element.');
            else {
                const renderRoot = selector === ''
                    ? contentRoot
                    : contentRoot.querySelector(selector);

                if (renderRoot !== null)
                    renderRoot.innerHTML = content;
            }
        }
        else
            throw new Error('Shadow root unexectedly missing from element.');
    }

    private buildHtmlString(constantSections: TemplateStringsArray, interpolatedSections: string[]) {
        let output = '';
        for (let i = 0; i < constantSections.length; i++) {
            const constant = constantSections[i];
            output += constantSections[i] + this.sanitize(interpolatedSections[i]);
        }

        return output;
    }
    // only use this if you're sure that the strings you are displaying are already escaped, or is content that is not dynamic.
    protected htmlDoNotEscape(strings: TemplateStringsArray, ...expressions: string[]) {
        return this.buildHtmlString(strings, expressions);
    }
    protected html(strings: TemplateStringsArray, ...expressions: string[]) {
        return this.buildHtmlString(strings, expressions.map(exp => exp ? he.encode(exp) : exp))
    }

    /* 
        use this to easily sanitize an entire html template string.
        example usage:
            this.template('#myContainerDiv')`
                <div>potentially unsafe value: ${someData.someValue}</div>
            `;

            ^^^ notice that this.sanitize() didn't have to be called here.  It will "magically" sanitize any string interpolation.
            More info: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates
    */
    protected template(containerElement = '', escapeHtml = true) {
        const self = this;

        return function (strings: TemplateStringsArray, ...expressions: string[]) {
            self.render(escapeHtml ? self.html(strings, ...expressions) : self.htmlDoNotEscape(strings, ...expressions), containerElement);
        }
    }


    protected generateSanitizer(): (content: string) => string {
        return content => purify.sanitize(content, {});
    }
    protected sanitize = this.generateSanitizer().bind(this);

    // === EVENT HANDLING AND COMPONENT COMMUNICATION ===
    removeGlobalEventListener(disconnectionId: number) {
        const callback = this.disconnectionCallbacks[disconnectionId];
        if (callback) {
            callback();
        }
        this.disconnectionCallbacks[disconnectionId] = undefined;
    }
    addGlobalEventListener<EventDetailType = any>(eventName: string, eventHandler: (e: CustomEvent<EventDetailType>) => (void | Promise<void>)): number {
        window.addEventListener(eventName, eventHandler as any)
        const disconnectId: number = this.callbackCounter++;
        this.disconnectionCallbacks[disconnectId] = () => window.removeEventListener(eventName, eventHandler as any)
        return disconnectId;
    }
    addTemporaryGlobalEventListener<T = any>(eventName: string, eventHandler: (e: CustomEvent<T>) => (void | Promise<void>), until: (data: CustomEvent) => boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            async function wrapper(e: CustomEvent<T>) {
                await eventHandler(e);
                if (until(e)) {
                    window.removeEventListener(eventName, wrapper as any);
                    resolve();
                }
            }
            window.addEventListener(eventName, wrapper as any);
        })
    }
    addOneTimeGlobalEventListener<T = any>(eventName: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            window.addEventListener(eventName, (async (e: CustomEvent<T>) => {
                resolve(e.detail);
            }) as any, { once: true });
        })
    }

    disconnectedCallback() {
        const callbacks = Object.keys(this.disconnectionCallbacks)
            .map(id => this.disconnectionCallbacks[parseInt(id)]);
        for (let callback of callbacks) {
            callback && callback();
        }
    }
    fireGlobalEvent(eventName: string, data?: unknown) {
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }))
    }

    // === RESPONSIVE WEB ===
    addFormFactorListener(cb: (size: FormFactor) => void) {
        const createFormFactorHandler = (size: FormFactor) => {
            return (e: MediaQueryListEvent) => e.matches && cb(size);
        }
        const handleMobile = createFormFactorHandler('mobile');
        const handleTablet = createFormFactorHandler('tablet');
        const handleDesktop = createFormFactorHandler('desktop');

        this.mobileMediaQueryList.addEventListener('change', handleMobile);
        this.disconnectionCallbacks[this.callbackCounter++] = (() => this.mobileMediaQueryList.removeEventListener('change', handleMobile));

        this.tabletMediaQueryList.addEventListener('change', handleTablet);
        this.disconnectionCallbacks[this.callbackCounter++] = (() => this.tabletMediaQueryList.removeEventListener('change', handleTablet));

        this.desktopMediaQueryList.addEventListener('change', handleDesktop);
        this.disconnectionCallbacks[this.callbackCounter++] = (() => this.desktopMediaQueryList.removeEventListener('change', handleDesktop));

        // fire off an initial call 
        if (this.mobileMediaQueryList.matches) {
            cb('mobile');
        }
        else if (this.tabletMediaQueryList.matches) {
            cb('tablet');
        }
        else if (this.desktopMediaQueryList.matches) {
            cb('desktop');
        }
    }
}
