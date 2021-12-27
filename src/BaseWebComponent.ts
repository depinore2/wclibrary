import purify from 'dompurify'
import * as he from 'he'

export abstract class BaseWebComponent extends HTMLElement {
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
        return this.buildHtmlString(strings,  expressions);
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
            self.render(containerElement, (escapeHtml ? self.html : self.htmlDoNotEscape)(strings, ...expressions));
        }
    }


    protected generateSanitizer(): (content: string) => string {
        return content => purify.sanitize(content, {});
    }
    protected sanitize = this.generateSanitizer().bind(this);
}
