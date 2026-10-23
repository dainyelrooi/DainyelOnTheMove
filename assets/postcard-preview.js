// Render only the shared, escaped email template. Never insert owner HTML.
// A shadow root isolates its email styles from the admin. The small allowlist
// excludes scripts, frames, forms, event attributes and active preview links.
const tags=new Set(['DIV','TABLE','TBODY','THEAD','TFOOT','TR','TD','TH','H1','H2','H3','P','A','IMG','BR','SPAN','STRONG','EM']);
const attributes=new Set(['style','role','width','height','cellspacing','cellpadding','align','alt','colspan','rowspan']);
const imageUrl=/^https:\/\/dainyelonthemove[.]com\/assets\/[a-zA-Z0-9/_-]+[.](?:webp|jpg|jpeg|png)$/;
export function clearPostcardPreview(host){if(!host)return;host.hidden=true;host.shadowRoot?.replaceChildren();}
export function renderPostcardPreview(host,html){
  const source=new DOMParser().parseFromString(html,'text/html');
  function copy(node){
    if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent);
    if(node.nodeType!==Node.ELEMENT_NODE||!tags.has(node.tagName))return document.createDocumentFragment();
    const result=document.createElement(node.tagName.toLowerCase());
    for(const {name,value} of node.attributes){
      if(attributes.has(name)&&!(name==='style'&&/url\s*\(|expression\s*\(|@import|behavior\s*:|-moz-binding\s*:/i.test(value)))result.setAttribute(name,value);
      if(name==='src'&&node.tagName==='IMG'&&imageUrl.test(value))result.setAttribute('src',value);
    }
    if(node.tagName==='A'){result.setAttribute('aria-disabled','true');result.tabIndex=-1;}
    for(const child of node.childNodes)result.append(copy(child));
    return result;
  }
  const surface=document.createElement('div');surface.style.cssText=source.body.style.cssText;
  for(const child of source.body.childNodes)surface.append(copy(child));
  const root=host.shadowRoot||host.attachShadow({mode:'open'});root.replaceChildren(surface);host.hidden=false;host.scrollTop=0;
}
