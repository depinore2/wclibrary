import purify from 'dompurify' 

export abstract class BaseWebComponent extends HTMLElement
{
    constructor(styles: string, initialContent: string = '') {
        super();

        this.attachShadow({ mode: 'open' });
        
        const styleTag = document.createElement('style');
        styleTag.appendChild(document.createTextNode(styles));

        const contentTag = document.createElement('div');
        contentTag.setAttribute('id', 'content');
        contentTag.innerHTML = initialContent;

        if(this.shadowRoot !== null) {
            this.shadowRoot.appendChild(styleTag);
            this.shadowRoot.appendChild(contentTag);
        }
        else
            throw new Error('ShadowRoot did not initialize properly.');
    }

    // prefer to use template() instead, as it's safer and simpler to use.
    protected render(content: string, selector: string = ''): void 
    {
        if(this.shadowRoot) {
            const contentRoot = this.shadowRoot.querySelector('#content');
        
            if(contentRoot === null) 
                throw new Error('Content root (#content) unexpectedly missing from element.');
            else {
                const renderRoot = selector === '' 
                                    ? contentRoot
                                    : contentRoot.querySelector(selector);

                if(renderRoot !== null)
                    renderRoot.innerHTML = content;
            }
        }
        else
            throw new Error('Shadow root unexectedly missing from element.');
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
    protected template(containerElement = '') {
        const self = this;
        return function (strings: TemplateStringsArray, ...expressions: string[]) {
            let output = '';
            for (let i = 0; i < strings.length; i++) {
                output += strings[i] + self.sanitize(expressions[i]);
            }
            self.render(output, containerElement);
        }
    }

    
    protected generateSanitizer(): (content: string) => string {
        return content => purify.sanitize(content, { });
    }
    protected sanitize = this.generateSanitizer().bind(this);
}