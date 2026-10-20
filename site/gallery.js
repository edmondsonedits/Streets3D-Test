const gallery=document.querySelector('#gallery');
const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
try{
 const response=await fetch('./tests.json');if(!response.ok)throw new Error('Registry unavailable');const data=await response.json();
 for(const test of data.tests){
  const card=element('article','card'),preview=element('a','preview');preview.href=test.url;preview.setAttribute('aria-label','Open '+test.title);
  const img=element('img');img.src=test.preview;img.alt=test.title+' preview';img.width=1440;img.height=950;img.loading='lazy';preview.append(img,element('span','badge',test.status));
  const content=element('div','card-content'),meta=element('div','meta');meta.append(element('span','',test.category),element('span','',test.date+' · v'+test.version));
  content.append(meta,element('h2','',test.title),element('p','description',test.description),element('p','controls',test.controls),element('p','limitation',test.limitation));
  const open=element('a','open');open.href=test.url;open.setAttribute('aria-label','Play '+test.title);open.append(element('span','','Play demo'),element('span','','↗'));content.append(open);card.append(preview,content);gallery.append(card);
 }
 document.querySelector('#testCount').textContent=data.tests.length+' playable experiments';
}catch(error){gallery.append(element('p','error','The gallery could not load. Please refresh, or open the two-demo comparison below.'));const link=element('a','','Open demos');link.href='./demos/street-alternatives-v1/';gallery.append(link);document.querySelector('#testCount').textContent='Gallery unavailable';}
