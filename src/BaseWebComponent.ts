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

    // use this to easily sanitize an entire html template string.
    protected html(strings:TemplateStringsArray, ...expressions: string[]) {
        let output = '';
        for(let i = 0; i < strings.length; i++) {
            output += strings[i] + this.sanitize(expressions[i]);
        }
        return output;
    }
    
    protected generateSanitizer(): (content: string) => string {
        return content => purify.sanitize(content, { });
    }
    protected sanitize = this.generateSanitizer().bind(this);
}