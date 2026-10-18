/* Universal Themes v0.7: library-led home. Never changes physical media or library permissions. */
(() => { 'use strict';
const $ = id => document.getElementById(id);
const base = new URL('../..', location.href).pathname.replace(/\/$/, '');
const auth = { token: null, userId: null };
const state = { section: 'all', query: '', genre: '', render: 0, libraries: [] };
const themes = new Set(['netflix-style','prime-style','disney-style']);
const deviceId = 'UniversalThemesWeb-Local';
function headers() { return { 'Content-Type': 'application/json', Authorization: `MediaBrowser Client="UniversalThemesWeb", Device="Browser", DeviceId="${deviceId}", Version="0.7.0", Token="${auth.token || ''}"` }; }
function params(o) { return new URLSearchParams(Object.entries(o).filter(([,v]) => v !== undefined && v !== null && v !== '')).toString(); }
async function api(url, opts={}) { const res = await fetch(base + url, { ...opts, headers: { ...headers(), ...(opts.headers||{}) } }); if (!res.ok) throw new Error(`Jellyfin HTTP ${res.status} on ${url.split('?')[0]}`); return res.json(); }
async function imageBlob(id, kind='Primary', width=450) { const r=await fetch(base+'/Items/'+encodeURIComponent(id)+'/Images/'+kind+'?'+params({width,quality:85}),{headers:headers()}); if(!r.ok) throw new Error('Image unavailable'); return URL.createObjectURL(await r.blob()); }
function poster(img,id,kind='Primary',width=450) { imageBlob(id,kind,width).then(url => { if(!img.isConnected){URL.revokeObjectURL(url);return;} img.src=url; img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>{URL.revokeObjectURL(url);img.remove();}; }).catch(()=>{}); }
function jellyfinLink(item) { return base + '/#!/details?id=' + encodeURIComponent(item.Id); }
function details(item) { $('detailsTitle').textContent=item.Name||'Untitled'; $('detailsMeta').textContent=[item.ProductionYear,item.Type,...(item.Genres||[]).slice(0,4)].filter(Boolean).join(' · '); $('detailsOverview').textContent=item.Overview||'No description available.'; $('jellyfinDetails').onclick=()=>{location.href=jellyfinLink(item);}; $('details').showModal(); }
$('closeDetails').onclick=()=> $('details').close();
$('details').addEventListener('click', e=>{if(e.target===$('details')) $('details').close();});
function tile(item) { const b=document.createElement('button');b.type='button';b.className='tile';b.title=item.Name||'View details'; const img=document.createElement('img');img.alt='';img.loading='lazy';b.append(img); poster(img,item.ImageTags?.Primary ? item.Id : (item.ParentPrimaryImageItemId||item.Id)); const copy=document.createElement('div');copy.className='copy';const n=document.createElement('strong');n.textContent=item.Name||'Untitled';const m=document.createElement('small');m.textContent=[item.ProductionYear,item.Type].filter(Boolean).join(' · ');copy.append(n,m);b.append(copy);b.onclick=()=>details(item);return b; }
async function getItems(extra={},limit=24) { const q={Recursive:'true',IncludeItemTypes:state.section==='all'?'Movie,Series':state.section,Limit:String(limit),StartIndex:'0',Fields:'Genres,Overview,PrimaryImageAspectRatio',EnableImageTypes:'Primary,Backdrop',...extra};return (await api('/Users/'+encodeURIComponent(auth.userId)+'/Items?'+params(q))).Items||[]; }
function shelf(label,items) { if(!items.length)return; const section=document.createElement('section');section.className='shelf';const title=document.createElement('h2');title.textContent=label; const wrap=document.createElement('div');wrap.className='rail-wrap';const rail=document.createElement('div');rail.className='rail';const left=document.createElement('button'), right=document.createElement('button');left.className='rail-arrow left';right.className='rail-arrow right';left.textContent='❮';right.textContent='❯';left.setAttribute('aria-label',`Scroll ${label} left`);right.setAttribute('aria-label',`Scroll ${label} right`);items.forEach(i=>rail.append(tile(i)));function update(){const max=rail.scrollWidth-rail.clientWidth;left.hidden=rail.scrollLeft<5;right.hidden=max<=5||rail.scrollLeft>=max-5;}left.onclick=()=>rail.scrollBy({left:-Math.max(320,rail.clientWidth*.85),behavior:'smooth'});right.onclick=()=>rail.scrollBy({left:Math.max(320,rail.clientWidth*.85),behavior:'smooth'});rail.addEventListener('scroll',update,{passive:true});wrap.append(rail,left,right);section.append(title,wrap);$('rows').append(section);requestAnimationFrame(update); }
async function loadLibraries(){const r=await api('/Users/'+encodeURIComponent(auth.userId)+'/Views');state.libraries=(r.Items||[]).filter(v=>v.Id && v.CollectionType!=='livetv' && v.CollectionType!=='channels');}
async function loadGenres(){try { const r=await api('/Genres?'+params({UserId:auth.userId,Recursive:'true',SortBy:'SortName',Limit:250}));const old=state.genre;$('genreSelect').replaceChildren(new Option('All genres',''));for(const g of r.Items||[]){ if(g.Name) $('genreSelect').add(new Option(g.Name,g.Name));} $('genreSelect').value=old; } catch(e){$('genreSelect').replaceChildren(new Option('All genres',''));}}
async function render(){const current=++state.render;$('rows').replaceChildren();$('status').textContent='Loading your library…';try{
 const filter={SortBy:'DateCreated',SortOrder:'Descending'};
 if(state.genre)filter.Genres=state.genre;
 if(state.query)filter.SearchTerm=state.query;
 const recent=await getItems(filter,24);if(current!==state.render)return;
 const hero=recent.find(i=>i.BackdropImageTags?.length)||recent[0];$('heroOpen').hidden=!hero;$('hero').style.backgroundImage='';if(hero){$('heroTitle').textContent=hero.Name;$('heroDescription').textContent=(hero.Overview||'Explore your collection.').slice(0,220);$('heroOpen').onclick=()=>details(hero);if(hero.BackdropImageTags?.length) imageBlob(hero.Id,'Backdrop',1400).then(u=>{if(current!==state.render){URL.revokeObjectURL(u);return;}$('hero').style.backgroundImage=`linear-gradient(90deg,var(--bg),#0002),url("${u}")`;}).catch(()=>{});}
 if(state.query){shelf('Search results',recent);}else if(state.genre){shelf(state.genre+' · Recently added',recent);}else{
  shelf('Recently added',recent);
  // Always index the accessible library views; this includes custom libraries without genre metadata.
  for(const lib of state.libraries){if(current!==state.render)return;const items=await getItems({...filter,ParentId:lib.Id},24);if(current!==state.render)return;shelf('Recently added · '+lib.Name,items);}
  // "Top rated" is local library data, not TMDB trending.
  if(state.section==='all'||state.section==='Movie'){const top=await getItems({SortBy:'CommunityRating',SortOrder:'Descending',IncludeItemTypes:'Movie'},24);if(current!==state.render)return;shelf('Top rated movies in your library',top);}
  if(state.section==='all'||state.section==='Series'){const top=await getItems({SortBy:'CommunityRating',SortOrder:'Descending',IncludeItemTypes:'Series'},24);if(current!==state.render)return;shelf('Top rated TV shows in your library',top);}
 }
 $('status').textContent=$('rows').children.length?'':'No matching titles in your accessible libraries.';
} catch(e){if(current===state.render)$('status').textContent='Unable to load library: '+e.message;}}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginStatus').textContent='Signing in…';try{const result=await api('/Users/AuthenticateByName',{method:'POST',body:JSON.stringify({Username:$('username').value,Pw:$('password').value,App:'UniversalThemesWeb',Device:'Browser',DeviceId:deviceId,Version:'0.7.0'})});auth.token=result.AccessToken;auth.userId=result.User.Id;$('password').value='';await loadLibraries();await loadGenres();$('login').hidden=true;$('app').hidden=false;render();}catch(ex){$('loginStatus').textContent='Login failed: '+ex.message;}};
$('signout').onclick=()=>{auth.token=null;auth.userId=null;state.libraries=[];$('app').hidden=true;$('login').hidden=false;$('rows').replaceChildren();};
$('homeLink').onclick=e=>{e.preventDefault();state.section='all';state.genre='';state.query='';$('genreSelect').value='';$('search').value='';document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('selected',b.dataset.section==='all'));render();};
document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{state.section=b.dataset.section;state.genre='';$('genreSelect').value='';document.querySelectorAll('[data-section]').forEach(x=>x.classList.toggle('selected',x===b));render();});
$('genreSelect').onchange=()=>{state.genre=$('genreSelect').value;render();};
let debounce;$('search').oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>{state.query=$('search').value.trim();render();},400);};
$('theme').onchange=()=>{document.body.dataset.theme=themes.has($('theme').value)?$('theme').value:'netflix-style';};
})();
