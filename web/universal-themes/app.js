/* Universal Themes v0.9: user-accessible library navigation, scoped genre filters. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const base=new URL('../..',location.href).pathname.replace(/\/$/,'');
const auth={token:null,userId:null};
const state={library:'',genre:'',query:'',render:0,libraries:[],page:0,pageSize:60,featured:[],featuredIndex:0,featuredTimer:null};
const themes=new Set(['netflix-style','prime-style','disney-style']);
const deviceId='UniversalThemesWeb-Local';
function headers(){return {'Content-Type':'application/json',Authorization:`MediaBrowser Client="UniversalThemesWeb", Device="Browser", DeviceId="${deviceId}", Version="0.9.0", Token="${auth.token||''}"`};}
function qs(o){return new URLSearchParams(Object.entries(o).filter(([,v])=>v!==undefined&&v!==null&&v!=='' )).toString();}
async function api(path,options={}){const response=await fetch(base+path,{...options,headers:{...headers(),...(options.headers||{})}});if(!response.ok)throw new Error(`Jellyfin HTTP ${response.status} on ${path.split('?')[0]}`);return response.json();}
async function imageBlob(id,kind='Primary',width=450){const r=await fetch(base+'/Items/'+encodeURIComponent(id)+'/Images/'+kind+'?'+qs({width,quality:85}),{headers:headers()});if(!r.ok)throw new Error('Image unavailable');return URL.createObjectURL(await r.blob());}
function poster(el,id,kind='Primary',width=450){imageBlob(id,kind,width).then(url=>{if(!el.isConnected){URL.revokeObjectURL(url);return;}el.src=url;el.onload=()=>URL.revokeObjectURL(url);el.onerror=()=>{URL.revokeObjectURL(url);el.remove();};}).catch(()=>{});}
function details(item){$('detailsTitle').textContent=item.Name||'Untitled';$('detailsMeta').textContent=[item.ProductionYear,item.Type,...(item.Genres||[]).slice(0,4)].filter(Boolean).join(' · ');$('detailsOverview').textContent=item.Overview||'No description available.';$('jellyfinDetails').onclick=()=>{location.href=base+'/#!/details?id='+encodeURIComponent(item.Id);};$('details').showModal();}
$('closeDetails').onclick=()=>$('details').close();
$('details').addEventListener('click',e=>{if(e.target===$('details'))$('details').close();});
function tile(item){const b=document.createElement('button');b.type='button';b.className='tile';b.title=item.Name||'View details';const im=document.createElement('img');im.alt='';im.loading='lazy';b.append(im);poster(im,item.ImageTags?.Primary?item.Id:item.ParentPrimaryImageItemId||item.Id);const copy=document.createElement('div');copy.className='copy';const name=document.createElement('strong');name.textContent=item.Name||'Untitled';const meta=document.createElement('small');meta.textContent=[item.ProductionYear,item.Type].filter(Boolean).join(' · ');copy.append(name,meta);b.append(copy);b.onclick=()=>details(item);return b;}
async function items(extra={},limit=24){const filter={Recursive:'true',IncludeItemTypes:'Movie,Series,Video',Limit:String(limit),StartIndex:'0',Fields:'Genres,Overview,PrimaryImageAspectRatio',EnableImageTypes:'Primary,Backdrop',...extra};return(await api('/Users/'+encodeURIComponent(auth.userId)+'/Items?'+qs(filter))).Items||[];}
function shelf(label,collection){if(!collection.length)return;const section=document.createElement('section');section.className='shelf';const title=document.createElement('h2');title.textContent=label;const wrap=document.createElement('div');wrap.className='rail-wrap';const rail=document.createElement('div');rail.className='rail';const left=document.createElement('button'),right=document.createElement('button');left.className='rail-arrow left';right.className='rail-arrow right';left.textContent='❮';right.textContent='❯';left.setAttribute('aria-label','Scroll '+label+' left');right.setAttribute('aria-label','Scroll '+label+' right');collection.forEach(i=>rail.append(tile(i)));function update(){const max=rail.scrollWidth-rail.clientWidth;left.hidden=rail.scrollLeft<5;right.hidden=max<=5||rail.scrollLeft>=max-5;}left.onclick=()=>rail.scrollBy({left:-Math.max(320,rail.clientWidth*.85),behavior:'smooth'});right.onclick=()=>rail.scrollBy({left:Math.max(320,rail.clientWidth*.85),behavior:'smooth'});rail.addEventListener('scroll',update,{passive:true});wrap.append(rail,left,right);section.append(title,wrap);$('rows').append(section);requestAnimationFrame(update);}
function currentLibrary(){return state.libraries.find(l=>l.Id===state.library);}
function mainFilter(extra={}){return {...(state.library?{ParentId:state.library}:{}),...(state.genre?{Genres:state.genre}:{}),...(state.query?{SearchTerm:state.query}:{}),...extra};}
async function loadLibraries(){const r=await api('/Users/'+encodeURIComponent(auth.userId)+'/Views');state.libraries=(r.Items||[]).filter(v=>v.Id&&v.Name&&v.CollectionType!=='livetv'&&v.CollectionType!=='channels');const nav=$('libraryNav');nav.replaceChildren();const home=document.createElement('button');home.type='button';home.textContent='Home';home.dataset.library='';nav.append(home);for(const lib of state.libraries){const b=document.createElement('button');b.type='button';b.textContent=lib.Name;b.dataset.library=lib.Id;nav.append(b);}nav.addEventListener('click',e=>{const b=e.target.closest('button[data-library]');if(!b)return;state.library=b.dataset.library;state.page=0;state.genre='';state.query='';$('search').value='';loadGenres().then(render).catch(render);highlightNavigation();});highlightNavigation();}
function highlightNavigation(){for(const b of $('libraryNav').querySelectorAll('button')){const active=b.dataset.library===state.library;b.classList.toggle('selected',active);b.setAttribute('aria-current',active?'page':'false');}}
async function loadGenres(){const select=$('genreSelect');select.replaceChildren(new Option('All genres',''));try{const query={UserId:auth.userId,Recursive:'true',SortBy:'SortName',Limit:500};if(state.library)query.ParentId=state.library;const r=await api('/Genres?'+qs(query));for(const g of r.Items||[]){if(g.Name)select.add(new Option(g.Name,g.Name));}}catch(err){console.warn('Could not load genre list',err);}if([...select.options].some(o=>o.value===state.genre))select.value=state.genre;else{state.genre='';select.value='';}}
// A library tab is a catalogue (paged grid); Home is an overview with rails.
function catalogueTile(item){return tile(item);}
function stopFeatured(){if(state.featuredTimer!==null){clearInterval(state.featuredTimer);state.featuredTimer=null;}state.featured=[];state.featuredIndex=0;}
let heroBackgroundUrl=null;
function clearHeroImage(){if(heroBackgroundUrl){URL.revokeObjectURL(heroBackgroundUrl);heroBackgroundUrl=null;}}
function showHero(item,stamp){
 if(stamp!==state.render)return;
 clearHeroImage();$('hero').style.backgroundImage='';
 $('heroTitle').textContent=item?.Name||currentLibrary()?.Name||'Your Jellyfin libraries';
 $('heroDescription').textContent=item?(item.Overview||'Explore this title in your library.').slice(0,235):'Browse content available to your account.';
 $('heroOpen').hidden=!item;
 if(item)$('heroOpen').onclick=()=>details(item);
 if(item?.BackdropImageTags?.length){imageBlob(item.Id,'Backdrop',1400).then(url=>{
  if(stamp!==state.render || state.featured[state.featuredIndex]?.Id!==item.Id && !state.library){URL.revokeObjectURL(url);return;}
  clearHeroImage();heroBackgroundUrl=url;
  $('hero').style.backgroundImage=`linear-gradient(90deg,var(--bg),#0002),url("${url}")`;
 }).catch(()=>{});}
}
function featureButtons(){
 const controls=$('featuredControls');controls.hidden=state.featured.length<2;
 const dots=$('featuredDots');dots.replaceChildren();
 state.featured.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.className=i===state.featuredIndex?'featured-dot active':'featured-dot';b.setAttribute('aria-label','Feature '+(i+1)+': '+item.Name);b.onclick=()=>{state.featuredIndex=i;displayFeatured(state.render);restartFeatured(state.render);};dots.append(b);});
}
function displayFeatured(stamp){const item=state.featured[state.featuredIndex];showHero(item,stamp);$('heroKicker').textContent=item?.featureGroup||'FEATURED FROM YOUR LIBRARY';featureButtons();}
function restartFeatured(stamp){if(state.featuredTimer!==null)clearInterval(state.featuredTimer);state.featuredTimer=null;
 if(state.featured.length<2||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 state.featuredTimer=setInterval(()=>{if(document.hidden||stamp!==state.render||!$('details').hidden && $('details').open)return;state.featuredIndex=(state.featuredIndex+1)%state.featured.length;displayFeatured(stamp);},3000);
}
$('featuredPrev').onclick=()=>{if(!state.featured.length)return;state.featuredIndex=(state.featuredIndex+state.featured.length-1)%state.featured.length;displayFeatured(state.render);restartFeatured(state.render);};
$('featuredNext').onclick=()=>{if(!state.featured.length)return;state.featuredIndex=(state.featuredIndex+1)%state.featured.length;displayFeatured(state.render);restartFeatured(state.render);};
function uniqueFeatures(recent,top){const picked=[],ids=new Set();for(const [group,list] of [['RECENTLY RELEASED',recent],['TOP RATED',top]]){for(const item of list.slice(0,6)){if(ids.has(item.Id))continue;ids.add(item.Id);picked.push({...item,featureGroup:group});}}return picked.slice(0,10);}
async function render(){
 const stamp=++state.render;stopFeatured();clearHeroImage();$('hero').style.backgroundImage='';$('rows').replaceChildren();$('status').textContent='Loading your library…';$('heroOpen').hidden=true;$('featuredControls').hidden=true;$('featuredDots').replaceChildren();$('heroKicker').textContent='YOUR LIBRARY';
 try{
  if(state.library){
   const lib=currentLibrary();const name=lib?.Name||'Library';
   const q=mainFilter({SortBy:'SortName',SortOrder:'Ascending',StartIndex:String(state.page*state.pageSize)});
   const paramsQuery={Recursive:'true',IncludeItemTypes:'Movie,Series,Video',Limit:String(state.pageSize),Fields:'Genres,Overview,PrimaryImageAspectRatio',EnableImageTypes:'Primary,Backdrop',...q};
   const response=await api('/Users/'+encodeURIComponent(auth.userId)+'/Items?'+qs(paramsQuery));if(stamp!==state.render)return;
   const all=response.Items||[];const count=response.TotalRecordCount;
   const first=all.find(x=>x.BackdropImageTags?.length)||all[0];showHero(first,stamp);$('heroKicker').textContent=name.toUpperCase();
   const grid=document.createElement('div');grid.className='catalogue-grid';all.forEach(x=>grid.append(catalogueTile(x)));
   const region=document.createElement('section');region.className='catalogue';const head=document.createElement('div');head.className='catalogue-heading';
   const h=document.createElement('h2');h.textContent=(state.genre?state.genre+' · ':'')+name;
   const qty=document.createElement('span');qty.className='catalogue-count';qty.textContent=Number.isFinite(count)?count+' titles':'';head.append(h,qty);region.append(head,grid);
   const pagination=document.createElement('div');pagination.className='catalogue-pagination';
   if(state.page>0){const prev=document.createElement('button');prev.textContent='← Previous';prev.onclick=()=>{state.page--;render();};pagination.append(prev);}
   const label=document.createElement('span');label.textContent='Page '+(state.page+1);pagination.append(label);
   if(Number.isFinite(count)?((state.page+1)*state.pageSize<count):all.length===state.pageSize){const next=document.createElement('button');next.textContent='Next →';next.onclick=()=>{state.page++;render();};pagination.append(next);}
   region.append(pagination);$('rows').append(region);
   if(!all.length) $('status').textContent='No titles found in '+name+(state.genre?' for '+state.genre:'')+'.';else $('status').textContent='';
   return;
  }
  // Home: editorial rails and rotating local-library features, never across inaccessible libraries.
  const baseFilter=mainFilter({SortBy:'DateCreated',SortOrder:'Descending'});
  const recent=await items(baseFilter,24);if(stamp!==state.render)return;
  const released=await items(mainFilter({SortBy:'PremiereDate',SortOrder:'Descending'}),12);if(stamp!==state.render)return;
  const top=await items(mainFilter({SortBy:'CommunityRating',SortOrder:'Descending'}),18);if(stamp!==state.render)return;
  state.featured=uniqueFeatures(released.filter(x=>x.PremiereDate||x.ProductionYear),top.filter(x=>Number(x.CommunityRating)>0));
  if(!state.featured.length)state.featured=uniqueFeatures(recent,[]);
  state.featuredIndex=0;if(state.featured.length){displayFeatured(stamp);restartFeatured(stamp);}else showHero(null,stamp);
  if(state.query||state.genre){shelf(state.query?'Search results':state.genre+' · Recently added',recent);}
  else{
   shelf('Recently added · All libraries',recent);
   for(const lib of state.libraries){if(stamp!==state.render)return;const data=await items({ParentId:lib.Id,SortBy:'DateCreated',SortOrder:'Descending'},24);if(stamp!==state.render)return;shelf('Recently added · '+lib.Name,data);}
   shelf('Top rated · Your library',top.filter(x=>Number(x.CommunityRating)>0));
  }
  $('status').textContent=$('rows').children.length?'':'No matching titles found in your accessible libraries.';
 }catch(err){if(stamp===state.render)$('status').textContent='Unable to load content: '+err.message;}
}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginStatus').textContent='Signing in…';try{const r=await api('/Users/AuthenticateByName',{method:'POST',body:JSON.stringify({Username:$('username').value,Pw:$('password').value,App:'UniversalThemesWeb',Device:'Browser',DeviceId:deviceId,Version:'0.9.0'})});auth.token=r.AccessToken;auth.userId=r.User.Id;$('password').value='';await loadLibraries();await loadGenres();$('login').hidden=true;$('app').hidden=false;render();}catch(err){$('loginStatus').textContent='Login failed: '+err.message;}};
$('homeLink').onclick=e=>{e.preventDefault();state.library='';state.page=0;state.genre='';state.query='';$('search').value='';highlightNavigation();loadGenres().then(render);};
$('signout').onclick=()=>{stopFeatured();clearHeroImage();auth.token=null;auth.userId=null;state.libraries=[];state.library='';state.genre='';$('app').hidden=true;$('login').hidden=false;$('rows').replaceChildren();};
$('genreSelect').onchange=()=>{state.genre=$('genreSelect').value;state.page=0;render();};
let debounce;$('search').oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>{state.query=$('search').value.trim();state.page=0;render();},400);};
$('theme').onchange=()=>{document.body.dataset.theme=themes.has($('theme').value)?$('theme').value:'netflix-style';};
})();
