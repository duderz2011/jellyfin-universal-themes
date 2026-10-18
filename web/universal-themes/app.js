/* Viewer-facing read-only genre browser. Tokens are kept in memory, never saved to disk. */
(()=>{'use strict';
const base=new URL('../..',location.href).pathname.replace(/\/$/,'');
const auth={token:null,userId:null}, page={section:'all',query:''};
const $=id=>document.getElementById(id);
const themes=new Set(['netflix-style','prime-style','disney-style']);
const genres=['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Family','Fantasy','Horror','Mystery','Romance','Science Fiction','Thriller','War','Western'];
function headers(){return {'Content-Type':'application/json','Authorization':`MediaBrowser Client="UniversalThemesWeb", Device="Browser", DeviceId="UniversalThemesWeb-Local", Version="0.6.0", Token="${auth.token||''}"`};}
async function api(path,options={}){const r=await fetch(base+path,{...options,headers:{...headers(),...(options.headers||{})}});if(!r.ok)throw Error(`Jellyfin HTTP ${r.status} on ${path.split('?')[0]}`);return r.json();}
function qs(obj){return new URLSearchParams(Object.entries(obj).filter(([,v])=>v!==undefined&&v!==null&&v!=='' )).toString();}
function link(id){return base+'/#!/details?id='+encodeURIComponent(id);}
async function authenticatedImage(id,kind='Primary',width=400){const r=await fetch(base+'/Items/'+encodeURIComponent(id)+'/Images/'+kind+'?'+qs({width,quality:85}),{headers:headers()});if(!r.ok)throw Error('Image unavailable');return URL.createObjectURL(await r.blob());}
function picture(el,id,kind,width){authenticatedImage(id,kind,width).then(url=>{if(!el.isConnected){URL.revokeObjectURL(url);return;}el.src=url;el.onload=()=>URL.revokeObjectURL(url);el.onerror=()=>{URL.revokeObjectURL(url);el.replaceWith(placeholder(''));};}).catch(()=>{if(el.isConnected)el.replaceWith(placeholder(''));});}
function openItem(item){window.open(link(item.Id),'_blank','noopener');}
function card(item){const b=document.createElement('button');b.className='tile';b.type='button';b.title='View '+(item.Name||'title');const image=(item.ImageTags&&item.ImageTags.Primary)||(item.ParentPrimaryImageTag);if(image){const pic=document.createElement('img');pic.loading='lazy';pic.alt='';pic.referrerPolicy='no-referrer';b.append(pic);picture(pic,item.ImageTags?.Primary?item.Id:item.ParentPrimaryImageItemId||item.Id,'Primary',400);}else b.append(placeholder(item.Name));const copy=document.createElement('div');copy.className='copy';const name=document.createElement('div');name.className='name';name.textContent=item.Name||'Untitled';const meta=document.createElement('small');meta.textContent=[item.ProductionYear,item.Type==='Series'?'Series':'Film'].filter(Boolean).join(' · ');copy.append(name,meta);b.append(copy);b.onclick=()=>openItem(item);return b;}
function placeholder(name){const p=document.createElement('div');p.className='poster-placeholder';p.textContent=(name||'?').slice(0,2).toUpperCase();return p;}
async function fetchItems(extra={},limit=20){const params={Recursive:'true',IncludeItemTypes:page.section==='all'?'Movie,Series':page.section,Limit:String(limit),StartIndex:'0',Fields:'Genres,Overview,PrimaryImageAspectRatio',ImageTypeLimit:'1',EnableImageTypes:'Primary,Backdrop',...extra};return (await api('/Users/'+auth.userId+'/Items?'+qs(params))).Items||[];}
async function row(label, filter) {
    const items = await fetchItems(filter, 24);
    if (!items.length) return;

    const shelf = document.createElement('section');
    shelf.className = 'shelf';

    const title = document.createElement('h2');
    title.textContent = label;

    const wrap = document.createElement('div');
    wrap.className = 'rail-wrap';

    const left = document.createElement('button');
    left.className = 'rail-arrow left';
    left.type = 'button';
    left.setAttribute('aria-label', 'Scroll left');
    left.innerHTML = '&#10094;';

    const right = document.createElement('button');
    right.className = 'rail-arrow right';
    right.type = 'button';
    right.setAttribute('aria-label', 'Scroll right');
    right.innerHTML = '&#10095;';

    const rail = document.createElement('div');
    rail.className = 'rail';

    items.forEach(i => rail.append(card(i)));

    function scrollAmount() {
        return Math.max(rail.clientWidth * 0.9, 320);
    }

    left.onclick = () => {
        rail.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    };

    right.onclick = () => {
        rail.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    };

    function updateArrows() {
        const maxScroll = rail.scrollWidth - rail.clientWidth;
        left.classList.toggle('hidden', rail.scrollLeft <= 5);
        right.classList.toggle('hidden', rail.scrollLeft >= maxScroll - 5 || maxScroll <= 0);
    }

    rail.addEventListener('scroll', updateArrows);

    if (window.ResizeObserver) {
        const ro = new ResizeObserver(updateArrows);
        ro.observe(rail);
    }

    wrap.append(left, rail, right);
    shelf.append(title, wrap);
    $('rows').append(shelf);
    requestAnimationFrame(updateArrows);
}
async function build(){ $('rows').replaceChildren();$('status').textContent='Loading your library…';$('heroOpen').hidden=true;try{const latest=await fetchItems({SortBy:'DateCreated',SortOrder:'Descending'},18);const hero=latest.find(i=>i.BackdropImageTags?.length)||latest[0];if(hero){$('heroTitle').textContent=hero.Name||'Your library';$('heroDescription').textContent=(hero.Overview||'Explore your personal Jellyfin collection.').slice(0,230);$('hero').style.backgroundImage='';if(hero.BackdropImageTags?.length){authenticatedImage(hero.Id,'Backdrop',1400).then(url=>{$('hero').style.backgroundImage=`linear-gradient(90deg,var(--bg),#0002),url("${url}")`;}).catch(()=>{});}$('heroOpen').hidden=false;$('heroOpen').onclick=()=>openItem(hero);}
await row('Recently added',{SortBy:'DateCreated',SortOrder:'Descending'});
if(page.query){await row('Search results for '+page.query,{SearchTerm:page.query});}
else{const picks=genres;for(const genre of picks){await row(genre,{Genres:genre,SortBy:'SortName',SortOrder:'Ascending'});}}
$('status').textContent='';if(!$('rows').children.length)$('status').textContent='No matching items in accessible libraries.';
}catch(e){$('status').textContent='Unable to load library: '+e.message;}}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginStatus').textContent='Signing in…';try{const r=await api('/Users/AuthenticateByName',{method:'POST',body:JSON.stringify({Username:$('username').value,Pw:$('password').value,App:"UniversalThemesWeb",Device:"Browser",DeviceId:"UniversalThemesWeb-Local",Version:"0.6.1"})});auth.token=r.AccessToken;auth.userId=r.User.Id;$('password').value='';$('login').hidden=true;$('app').hidden=false;build();}catch(e){$('loginStatus').textContent='Login failed: '+e.message;}};
$('signout').onclick=()=>{auth.token=null;auth.userId=null;$('app').hidden=true;$('login').hidden=false;$('rows').replaceChildren();};
document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-section]').forEach(x=>x.classList.toggle('selected',x===b));page.section=b.dataset.section;build();});
let searchTimer;$('search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page.query=$('search').value.trim();build();},450);};
$('theme').onchange=()=>{document.body.dataset.theme=themes.has($('theme').value)?$('theme').value:'netflix-style';};
})();
