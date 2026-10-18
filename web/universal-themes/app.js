/* Universal Themes v0.9: user-accessible library navigation, scoped genre filters. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const base=new URL('../..',location.href).pathname.replace(/\/$/,'');
const auth={token:null,userId:null};
const state={library:'',genre:'',query:'',render:0,libraries:[],page:0,pageSize:60,featured:[],featuredIndex:0,featuredTimer:null};
const themes=new Set(['netflix-style','prime-style','disney-style']);
// This viewer is designed for a trusted personal device. Stored access tokens can be read by JavaScript on this origin.
const sessionKey='utv-session-v1';
let nextEpisodePromise=null;
let nextEpisodePending=false;

const deviceId='UniversalThemesWeb-Local';
let selectedItem=null;
function saveSession(){try{localStorage.setItem(sessionKey,JSON.stringify({token:auth.token,userId:auth.userId}));}catch(e){console.warn('Session could not be saved',e);}}
function forgetSession(){try{localStorage.removeItem(sessionKey);}catch(e){}}

function headers(){return {'Content-Type':'application/json',Authorization:`MediaBrowser Client="UniversalThemesWeb", Device="Browser", DeviceId="${deviceId}", Version="1.8.1", Token="${auth.token||''}"`};}
function qs(o){return new URLSearchParams(Object.entries(o).filter(([,v])=>v!==undefined&&v!==null&&v!=='' )).toString();}
async function api(path,options={}){const response=await fetch(base+path,{...options,headers:{...headers(),...(options.headers||{})}});if(!response.ok)throw new Error(`Jellyfin HTTP ${response.status} on ${path.split('?')[0]}`);return response.json();}
async function imageBlob(id,kind='Primary',width=450){const r=await fetch(base+'/Items/'+encodeURIComponent(id)+'/Images/'+kind+'?'+qs({width,quality:85}),{headers:headers()});if(!r.ok)throw new Error('Image unavailable');return URL.createObjectURL(await r.blob());}
function poster(el,id,kind='Primary',width=450){imageBlob(id,kind,width).then(url=>{if(!el.isConnected){URL.revokeObjectURL(url);return;}el.src=url;el.onload=()=>URL.revokeObjectURL(url);el.onerror=()=>{URL.revokeObjectURL(url);el.remove();};}).catch(()=>{});}
function details(item){
 selectedItem=item;
 $('detailsTitle').textContent=item.Name||'Untitled';
 $('detailsMeta').textContent=[item.ProductionYear,item.Type,...(item.Genres||[]).slice(0,4)].filter(Boolean).join(' · ');
 $('detailsOverview').textContent=item.Overview||'No description available.';
 $('playTitle').textContent=item.Type==='Series'?'Choose episode':'Play now';
 $('playStatus').textContent='';
 $('episodeList').replaceChildren();
 $('playTitle').hidden=false;
 if(item.Type==='Series') loadEpisodes(item).catch(err=>{$('playStatus').textContent='Could not load episodes: '+err.message;});
 else $('playTitle').onclick=()=>playItem(item);
 $('details').showModal();
}
async function loadEpisodes(series){
 const target=$('episodeList');target.replaceChildren();$('playTitle').disabled=true;
 $('playStatus').textContent='Loading episodes…';
 try{
  const r=await api('/Shows/'+encodeURIComponent(series.Id)+'/Episodes?'+qs({UserId:auth.userId,IsVirtualUnaired:'false',Limit:500,Fields:'Overview'}));
  if(selectedItem?.Id!==series.Id)return;
  const episodes=(r.Items||[]).filter(e=>e.LocationType!=='Virtual'&&e.Id);
  if(!episodes.length){$('playStatus').textContent='No playable episodes in this series.';return;}
  $('playStatus').textContent='Select an episode to play.';
  for(const episode of episodes){const btn=document.createElement('button');btn.type='button';btn.textContent=(episode.ParentIndexNumber?`S${episode.ParentIndexNumber} `:'')+(episode.IndexNumber?`E${episode.IndexNumber} `:'')+(episode.Name||'Episode');btn.onclick=()=>playItem(episode);target.append(btn);}
 } finally{$('playTitle').disabled=false;}
}
/* v1.2: Jellyfin-synchronised Next Up and Continue Watching. */
async function findNextEpisode(episode){
 if(!episode.SeriesId)return null;
 // Only playable, accessible episodes; Jellyfin supplies the user's watched state.
 const result=await api('/Shows/'+encodeURIComponent(episode.SeriesId)+'/Episodes?'+qs({UserId:auth.userId,IsVirtualUnaired:'false',Limit:10000,Fields:'Overview'}));
 const episodes=(result.Items||[]).filter(x=>x.Id&&x.LocationType!=='Virtual' && x.ParentIndexNumber!==0);
 episodes.sort((a,b)=>(a.ParentIndexNumber??0)-(b.ParentIndexNumber??0)||(a.IndexNumber??0)-(b.IndexNumber??0));
 const idx=episodes.findIndex(e=>e.Id===episode.Id);
 return idx>=0 ? (episodes[idx+1]||null) : null;
}
function refreshHomeProgress(){if(auth.token&&!state.library){render().catch(e=>console.warn('Home refresh failed',e));}}
async function addProgressRows(stamp){
 // First ask Jellyfin for the signed-in user's resumable items.
 try{
  const r=await api('/Users/'+encodeURIComponent(auth.userId)+'/Items?'+qs({Recursive:'true',IsResumable:'true',IncludeItemTypes:'Movie,Episode,Video',Fields:'Genres,Overview,PrimaryImageAspectRatio',Limit:30,SortBy:'DatePlayed',SortOrder:'Descending'}));
  if(stamp!==state.render)return;
  const entries=(r.Items||[]).filter(x=>Number(x.UserData?.PlaybackPositionTicks)>0 && !x.UserData?.Played);
  shelf('Continue Watching',entries);
 }catch(e){console.warn('Continue Watching is unavailable',e);}
 try{
  const r=await api('/Shows/NextUp?'+qs({UserId:auth.userId,Limit:30,Fields:'Overview,Genres',EnableResumable:false}));
  if(stamp!==state.render)return;
  shelf('Next Up · TV Shows',(r.Items||[]).filter(x=>x.Id&&x.LocationType!=='Virtual'));
 }catch(e){console.warn('Next Up is unavailable',e);}
}
/* v1.1: playback session reporting + resume, without changing the existing direct-stream player. */
let activePlayback=null;
let playbackInterval=null;
function ticksAtPlayback(){
 const v=$('videoPlayer');
 return Math.max(0,Math.round((Number.isFinite(v.currentTime)?v.currentTime:0)*10000000));
}
function reportPlayback(endpoint,keepalive=false){
 if(!activePlayback||!auth.token)return Promise.resolve();
 const p=activePlayback;
 const data={ItemId:p.itemId,MediaSourceId:p.mediaSourceId,PlaySessionId:p.playSessionId,
  PlayMethod:'DirectStream',PositionTicks:ticksAtPlayback(),IsPaused:$('videoPlayer').paused,
  IsMuted:$('videoPlayer').muted};
 return fetch(base+'/Sessions/Playing'+endpoint,{method:'POST',headers:headers(),body:JSON.stringify(data),keepalive})
  .then(r=>{if(!r.ok)console.warn('Playback progress HTTP',r.status);})
  .catch(e=>console.warn('Playback status could not be reported',e));
}
function clearPlaybackTimer(){if(playbackInterval!==null){clearInterval(playbackInterval);playbackInterval=null;}}
function stopPlayer(){
 nextEpisodePending=false;
 const v=$('videoPlayer');
 clearPlaybackTimer();
 if(activePlayback){reportPlayback('/Stopped',true);activePlayback=null;}
 v.pause();v.removeAttribute('src');v.load();
 if($('player').open)$('player').close();
 refreshHomeProgress();
}
$('closePlayer').onclick=stopPlayer;
$('player').addEventListener('cancel',e=>{e.preventDefault();stopPlayer();});
$('player').addEventListener('click',e=>{if(e.target===$('player'))stopPlayer();});
async function playItem(item){
 $('playStatus').textContent='Preparing playback…';
 try{
  if(!auth.token)throw Error('Please sign in again.');
  // Resolve the user's saved position even if it was not included in catalogue responses.
  let startingAt=0;
  try{
   const detail=await api('/Users/'+encodeURIComponent(auth.userId)+'/Items/'+encodeURIComponent(item.Id));
   const saved=Number(detail.UserData?.PlaybackPositionTicks||0);
   if(saved>300000000 && !detail.UserData?.Played && window.confirm('Resume '+(item.Name||'video')+' where you left off?')) startingAt=saved;
  }catch(e){console.warn('No resume data available',e);}
  const info=await api('/Items/'+encodeURIComponent(item.Id)+'/PlaybackInfo?'+qs({UserId:auth.userId}),{
   method:'POST',body:JSON.stringify({UserId:auth.userId,StartTimeTicks:startingAt,
    EnableDirectPlay:true,EnableDirectStream:true,EnableTranscoding:true})});
  const source=(info.MediaSources||[]).find(x=>x.SupportsDirectPlay||x.SupportsDirectStream)||(info.MediaSources||[])[0];
  if(!source)throw Error('Jellyfin did not return an accessible media source.');
  const stream=new URL(base+'/Videos/'+encodeURIComponent(item.Id)+'/stream',location.origin);
  stream.searchParams.set('Static','true');stream.searchParams.set('MediaSourceId',source.Id||item.Id);
  stream.searchParams.set('api_key',auth.token);
  const v=$('videoPlayer');
  if(activePlayback)stopPlayer();
  activePlayback={itemId:item.Id,mediaSourceId:source.Id||item.Id,playSessionId:info.PlaySessionId||undefined};
  nextEpisodePending=false;
  nextEpisodePromise=item.Type==='Episode'?findNextEpisode(item).catch(e=>{console.warn('Next episode unavailable',e);return null;}):Promise.resolve(null);
  v.src=stream.toString();v.load();
  if(startingAt>0){v.addEventListener('loadedmetadata',function resumeOnce(){
   v.removeEventListener('loadedmetadata',resumeOnce);
   const seconds=startingAt/10000000;
   if(Number.isFinite(v.duration)&&v.duration>0)v.currentTime=Math.min(seconds,Math.max(0,v.duration-5));
   else v.currentTime=seconds;
  });}
  $('playerTitle').textContent=item.Name||'Video';$('playerStatus').textContent='';$('playStatus').textContent='';
  if($('details').open)$('details').close();if(!$('player').open)$('player').showModal();
  v.play().catch(()=>{$('playerStatus').textContent='Press Play to start. This file may require a compatible format or transcoding.';});
 }catch(err){$('playStatus').textContent='Playback unavailable: '+err.message;if($('player').open)$('playerStatus').textContent='Unable to start next episode: '+err.message;}
}
const playbackVideo=$('videoPlayer');
playbackVideo.addEventListener('playing',()=>{
 $('playerStatus').textContent='';
 if(activePlayback&&!activePlayback.started){activePlayback.started=true;reportPlayback('');}
 clearPlaybackTimer();playbackInterval=setInterval(()=>reportPlayback('/Progress'),10000);
});
playbackVideo.addEventListener('pause',()=>{if(activePlayback)reportPlayback('/Progress');clearPlaybackTimer();});
playbackVideo.addEventListener('seeked',()=>{if(activePlayback)reportPlayback('/Progress');});
/* Mark the completed item stopped on Jellyfin before starting another episode. */
/* Universal Themes v1.3 next-episode countdown */
let nextCountdownTimer = null;
let pendingEpisode = null;
function clearNextCountdown() {
 if (nextCountdownTimer !== null) { clearInterval(nextCountdownTimer); nextCountdownTimer = null; }
 pendingEpisode = null;
 $('nextEpisodePrompt').hidden = true;
}
async function startPendingEpisode() {
 const episode = pendingEpisode;
 if (!episode) return;
 clearNextCountdown();
 $('playerStatus').textContent = 'Loading next episodeâ€¦';
 await playItem(episode);
 refreshHomeProgress();
}
$('playNextNow').onclick = startPendingEpisode;
$('cancelNext').onclick = () => {
 clearNextCountdown();
 if ($('player').open) $('player').close();
 refreshHomeProgress();
};
const originalStopPlayer = stopPlayer;
stopPlayer = function () { clearNextCountdown(); originalStopPlayer(); };
playbackVideo.addEventListener('ended', async () => {
 const finished = activePlayback?.itemId;
 const possibleNext = nextEpisodePromise;
 clearPlaybackTimer();
 if (activePlayback) { await reportPlayback('/Stopped'); activePlayback = null; }
 const v = $('videoPlayer'); v.pause(); v.removeAttribute('src'); v.load();
 let next = null;
 try { next = await possibleNext; } catch (e) { console.warn('Next episode lookup failed',e); }
 if (!finished || !next || !auth.token || !$('player').open) {
  if ($('player').open) $('player').close(); refreshHomeProgress(); return;
 }
 clearNextCountdown();
 pendingEpisode = next;
 const title = [next.SeriesName,next.ParentIndexNumber != null ? 'S'+next.ParentIndexNumber : '',next.IndexNumber != null ? 'E'+next.IndexNumber : '',next.Name].filter(Boolean).join(' Â· ');
 $('nextEpisodeTitle').textContent = 'Up next: ' + title;
 $('nextEpisodePrompt').hidden = false;
 let seconds = 8;
 $('nextEpisodeCountdown').textContent = 'Starting in ' + seconds + ' secondsâ€¦';
 nextCountdownTimer = setInterval(() => {
  if (document.hidden) return;
  seconds--;
  $('nextEpisodeCountdown').textContent = 'Starting in ' + seconds + ' secondsâ€¦';
  if (seconds <= 0) { startPendingEpisode(); }
 },1000);
 $('playNextNow').focus();
});
playbackVideo.addEventListener('error',()=>{$('playerStatus').textContent='Unable to play this format directly. A Jellyfin transcoding-capable player is still needed for unsupported codecs.';});

$('closeDetails').onclick=()=>$('details').close();
$('details').addEventListener('click',e=>{if(e.target===$('details'))$('details').close();});
function tile(item){const b=document.createElement('button');b.type='button';b.className='tile';b.title=item.Name||'View details';const im=document.createElement('img');im.alt='';im.loading='lazy';b.append(im);poster(im,item.ImageTags?.Primary?item.Id:item.ParentPrimaryImageItemId||item.Id);const copy=document.createElement('div');copy.className='copy';const name=document.createElement('strong');name.textContent=item.Name||'Untitled';const meta=document.createElement('small');meta.textContent=item.Type==='Episode'?[item.SeriesName,`S${item.ParentIndexNumber??'?'} E${item.IndexNumber??'?'}`].filter(Boolean).join(' · '):[item.ProductionYear,item.Type].filter(Boolean).join(' · ');copy.append(name,meta);b.append(copy);b.onclick=()=>details(item);return b;}
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
 state.featuredTimer=setInterval(()=>{if(document.hidden||stamp!==state.render||$('details').open||$('player').open)return;state.featuredIndex=(state.featuredIndex+1)%state.featured.length;displayFeatured(stamp);},3000);
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
   await addProgressRows(stamp);if(stamp!==state.render)return;
   shelf('Recently added · All libraries',recent);
   for(const lib of state.libraries){if(stamp!==state.render)return;const data=await items({ParentId:lib.Id,SortBy:'DateCreated',SortOrder:'Descending'},24);if(stamp!==state.render)return;shelf('Recently added · '+lib.Name,data);}
   shelf('Top rated · Your library',top.filter(x=>Number(x.CommunityRating)>0));
  }
  $('status').textContent=$('rows').children.length?'':'No matching titles found in your accessible libraries.';
 }catch(err){if(stamp===state.render)$('status').textContent='Unable to load content: '+err.message;}
}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginStatus').textContent='Signing in…';try{const r=await api('/Users/AuthenticateByName',{method:'POST',body:JSON.stringify({Username:$('username').value,Pw:$('password').value,App:'UniversalThemesWeb',Device:'Browser',DeviceId:deviceId,Version:'1.2.0'})});auth.token=r.AccessToken;auth.userId=r.User.Id;saveSession();$('password').value='';await loadLibraries();await loadGenres();$('login').hidden=true;$('app').hidden=false;render();}catch(err){$('loginStatus').textContent='Login failed: '+err.message;}};
$('homeLink').onclick=e=>{e.preventDefault();state.library='';state.page=0;state.genre='';state.query='';$('search').value='';highlightNavigation();loadGenres().then(render);};
$('signout').onclick=async()=>{
 if($('player').open)stopPlayer();if($('details').open)$('details').close();
 stopFeatured();clearHeroImage();
 // Invalidate this device's session on Jellyfin where supported, then always clear local credentials.
 const token=auth.token;
 forgetSession();auth.token=null;auth.userId=null;
 state.libraries=[];state.library='';state.genre='';state.query='';
 $('app').hidden=true;$('login').hidden=false;$('rows').replaceChildren();$('username').value='';$('password').value='';
 if(token){try{await fetch(base+'/Sessions/Logout',{method:'POST',headers:{'Authorization':`MediaBrowser Client="UniversalThemesWeb", Device="Browser", DeviceId="${deviceId}", Version="1.8.1", Token="${token}"`}});}catch(e){console.warn('Server logout not confirmed',e);}}
};
async function restoreSession(){
 let saved;try{saved=JSON.parse(localStorage.getItem(sessionKey)||'null');}catch(e){forgetSession();return;}
 if(!saved?.token||!saved?.userId)return;
 auth.token=saved.token;auth.userId=saved.userId;
 try{
  const me=await api('/Users/Me');if(me.Id!==auth.userId)throw Error('User session mismatch');
  await loadLibraries();await loadGenres();$('login').hidden=true;$('app').hidden=false;render();
 }catch(e){forgetSession();auth.token=null;auth.userId=null;$('loginStatus').textContent='Previous session expired. Please sign in again.';}
}
restoreSession();
$('genreSelect').onchange=()=>{state.genre=$('genreSelect').value;state.page=0;render();};
let debounce;$('search').oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>{state.query=$('search').value.trim();state.page=0;render();},400);};
$('theme').onchange=()=>{document.body.dataset.theme=themes.has($('theme').value)?$('theme').value:'netflix-style';};
/* UT_ADVANCED_V14_START: browser subtitle and audio-track controls */
let utTrackLoadId=0;
const utAudio=$('utAudioTrack'),utSub=$('utSubtitleTrack'),utTrackInfo=$('utTrackInfo');
const utTrackUrls=[];
function utFreeTracks(){for(const u of utTrackUrls)URL.revokeObjectURL(u);utTrackUrls.length=0;const v=$('videoPlayer');for(const t of [...v.querySelectorAll('track[data-ut]')])t.remove();utAudio.replaceChildren(new Option('Default audio',''));utSub.replaceChildren(new Option('Off',''));utTrackInfo.textContent='';}
function utStreamLabel(stream){return [stream.DisplayTitle,stream.Language,stream.Codec,stream.Channels?stream.Channels+'ch':''].filter(Boolean).join(' · ') || 'Track '+stream.Index;}
async function utRefreshTracks(){
 const current=activePlayback,stamp=++utTrackLoadId;
 utFreeTracks();
 if(!current)return;
 try{
  const response=await api('/Items/'+encodeURIComponent(current.itemId)+'/PlaybackInfo?'+qs({UserId:auth.userId}),{method:'POST',body:JSON.stringify({UserId:auth.userId,EnableDirectPlay:true,EnableDirectStream:true,EnableTranscoding:true})});
  if(stamp!==utTrackLoadId||activePlayback!==current)return;
  const source=(response.MediaSources||[]).find(s=>s.Id===current.mediaSourceId)||(response.MediaSources||[])[0];
  const streams=source?.MediaStreams||[];
  const audio=streams.filter(s=>s.Type==='Audio'), subs=streams.filter(s=>s.Type==='Subtitle');
  utAudio.replaceChildren();
  for(const s of audio)utAudio.add(new Option(utStreamLabel(s),String(s.Index)));
  if(!audio.length)utAudio.add(new Option('Default audio',''));
  for(const s of subs){if(s.IsExternal && s.IsTextSubtitleStream!==false)utSub.add(new Option(utStreamLabel(s),String(s.Index)));}
  utTrackInfo.textContent='External text subtitles can be selected here. Embedded audio switching depends on the browser. Unsupported video formats may require a transcoding player.';
 }catch(e){if(stamp===utTrackLoadId)utTrackInfo.textContent='Unable to load track information: '+e.message;}
}
utSub.onchange=()=>{
 const v=$('videoPlayer');for(const t of [...v.querySelectorAll('track[data-ut]')])t.remove();
 if(!utSub.value)return;
 const p=activePlayback;if(!p)return;
 const url=new URL(base+'/Videos/'+encodeURIComponent(p.itemId)+'/'+encodeURIComponent(p.mediaSourceId)+'/Subtitles/'+encodeURIComponent(utSub.value)+'/Stream.vtt',location.origin);
 url.searchParams.set('api_key',auth.token);
 const tr=document.createElement('track');tr.dataset.ut='1';tr.kind='subtitles';tr.label=utSub.options[utSub.selectedIndex].text;tr.srclang='en';tr.src=url.toString();tr.default=true;v.append(tr);
 tr.addEventListener('load',()=>{try{tr.track.mode='showing';}catch(e){}});
};
utAudio.onchange=()=>{
 const tracks=$('videoPlayer').audioTracks;
 if(!tracks||!tracks.length){utTrackInfo.textContent='This browser cannot switch embedded audio tracks. A Jellyfin transcoding/HLS player is required for reliable switching.';return;}
 const index=Number(utAudio.value);let found=false;
 for(let i=0;i<tracks.length;i++){const t=tracks[i];const match=t.id===String(index)||i===utAudio.selectedIndex;t.enabled=match;found=found||match;}
 utTrackInfo.textContent=found?'Audio track selection requested.':'No matching browser audio track is exposed.';
};
$('videoPlayer').addEventListener('playing',()=>{if(activePlayback&&utAudio.options.length<=1)utRefreshTracks();});
$('videoPlayer').addEventListener('emptied',()=>{utTrackLoadId++;utFreeTracks();});
/* UT_ADVANCED_V14_END */
/* UT_HLS_V15_START: Experimental, user-selected Jellyfin HLS transcoding. */
let utHlsEngine=null;
let utHlsCurrentItem=null;
let utHlsLoading=false;
const utHlsButton=$('utTryHls');
const utHlsStatus=$('utHlsStatus');
function utDestroyHls(){if(utHlsEngine){utHlsEngine.destroy();utHlsEngine=null;}}
const utOriginalStopPlayer=stopPlayer;
stopPlayer=function(){utDestroyHls();utHlsCurrentItem=null;utOriginalStopPlayer();};
const utOriginalPlayItem=playItem;
playItem=async function(item){utDestroyHls();utHlsCurrentItem=item;utHlsStatus.textContent='Direct playback is selected. Use HLS if this format fails.';return utOriginalPlayItem(item);};
/* UT_QUALITY_V17_START: quality cap sent in Jellyfin device profile. */
const utQualitySelect = $('utQuality');
function utQualitySettings(){
 const settings = {auto:{bitrate:12000000},high:{bitrate:8000000,width:1920,height:1080},medium:{bitrate:4000000,width:1280,height:720},low:{bitrate:2000000,width:854,height:480}};
 return settings[utQualitySelect.value] || settings.auto;
}
function utHlsProfile(){
 const quality=utQualitySettings();
 return {
 MaxStreamingBitrate:quality.bitrate,
 DirectPlayProfiles:[],
 TranscodingProfiles:[{Container:'ts',Type:'Video',VideoCodec:'h264',AudioCodec:'aac',Protocol:'hls',Context:'Streaming',MaxAudioChannels:'2',MaxWidth:quality.width||undefined,MaxHeight:quality.height||undefined,MinSegments:1,SegmentLength:6,BreakOnNonKeyFrames:true}],
 CodecProfiles:[],
 SubtitleProfiles:[{Format:'vtt',Method:'External'}]
};}
async function utStartHls(){
 if(utHlsLoading)return;
 const p=activePlayback;
 const item=utHlsCurrentItem;
 if(!p||!item){utHlsStatus.textContent='Start a movie or episode before selecting HLS.';return;}
 if(!window.Hls?.isSupported() && !$('videoPlayer').canPlayType('application/vnd.apple.mpegurl')){
  utHlsStatus.textContent='HLS is unsupported here or hls.js did not load.';return;
 }
 utHlsLoading=true;utHlsButton.disabled=true;
 const video=$('videoPlayer');
 const previousPosition=Number.isFinite(video.currentTime)?video.currentTime:0;
 const oldPlayback=activePlayback;
 utHlsStatus.textContent='Asking Jellyfin to create a compatible stream…';
 try{
  const info=await api('/Items/'+encodeURIComponent(item.Id)+'/PlaybackInfo?'+qs({UserId:auth.userId}),{
   method:'POST',body:JSON.stringify({UserId:auth.userId,StartTimeTicks:Math.round(previousPosition*10000000),EnableDirectPlay:false,EnableDirectStream:false,EnableTranscoding:true,AutoOpenLiveStream:true,MediaSourceId:oldPlayback.mediaSourceId,AudioStreamIndex:ut18AudioIndex===null?undefined:ut18AudioIndex,SubtitleStreamIndex:ut18SubtitleIndex>=0?ut18SubtitleIndex:-1,AlwaysBurnInSubtitleWhenTranscoding:ut18ShouldBurn(),AllowVideoStreamCopy:!ut18ShouldBurn(),DeviceProfile:ut18HlsProfile()})
  });
  const source=(info.MediaSources||[]).find(s=>s.TranscodingUrl) || (info.MediaSources||[])[0];
  if(!source?.TranscodingUrl)throw Error('Jellyfin did not supply an HLS TranscodingUrl. Check server transcoding permissions and logs.');
  const url=new URL(source.TranscodingUrl,location.origin);
  if(url.origin!==location.origin)throw Error('Unexpected transcoding URL origin.');
  if(!url.searchParams.has('api_key'))url.searchParams.set('api_key',auth.token);
  utDestroyHls();
  if(activePlayback){await reportPlayback('/Stopped');activePlayback=null;}
  clearPlaybackTimer();
  video.pause();video.removeAttribute('src');video.load();
  activePlayback={itemId:item.Id,mediaSourceId:source.Id||oldPlayback.mediaSourceId,playSessionId:info.PlaySessionId||oldPlayback.playSessionId,playMethod:'Transcode'};
  const resume=()=>{if(previousPosition>5 && Number.isFinite(video.duration) && video.duration>previousPosition+10)video.currentTime=previousPosition;video.play().catch(()=>{utHlsStatus.textContent='HLS stream ready. Press Play.';});};
  if(video.canPlayType('application/vnd.apple.mpegurl')){
   video.src=url.toString();video.addEventListener('loadedmetadata',resume,{once:true});video.load();
  }else{
   utHlsEngine=new Hls({enableWorker:true,maxBufferLength:30});
   utHlsEngine.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal){utHlsStatus.textContent='HLS error: '+data.details+' — see Jellyfin server logs.';}});
   utHlsEngine.on(Hls.Events.MANIFEST_PARSED,resume);
   utHlsEngine.loadSource(url.toString());utHlsEngine.attachMedia(video);
  }
  utHlsStatus.textContent='Jellyfin HLS/transcoding test active.';
 }catch(e){utHlsStatus.textContent='Transcoding unavailable: '+e.message;console.warn('Jellyfin HLS failed',e);}
 finally{utHlsLoading=false;utHlsButton.disabled=false;}
}
utHlsButton.addEventListener('click',utStartHls);
utQualitySelect.addEventListener('change',()=>{
 const q=utQualitySettings();
 utHlsStatus.textContent = utQualitySelect.value==='auto'?'Automatic quality selected.':'Quality preference set ('+Math.round(q.bitrate/1000000)+' Mbps cap).';
 if(!activePlayback) return;
 if(activePlayback.playMethod==='Transcode' || utQualitySelect.value!=='auto') utStartHls();
});
/* UT_QUALITY_V17_END */
/* UT_HLS_V15_END */
/* UT_AUTO_HLS_V16_START: one automatic direct-to-HLS fallback per item. */
let utAutoItemId = null;
let utAutoAttempted = false;
let utAutoTimer = null;
let utAutoSwitching = false;
function utClearAutoTimer(){if(utAutoTimer!==null){clearTimeout(utAutoTimer);utAutoTimer=null;}}
function utArmAutoTimer(){
 utClearAutoTimer();
 const p=activePlayback;
 if(!p || p.playMethod==='Transcode' || utAutoSwitching || utAutoAttempted)return;
 utAutoTimer=setTimeout(()=>{
  const v=$('videoPlayer');
  if(activePlayback===p && !$('videoPlayer').paused && v.readyState<3 && !utAutoAttempted){utTryAutoHls('Direct playback did not start');}
 },20000);
}
async function utTryAutoHls(reason){
 const p=activePlayback;
 if(!p || p.playMethod==='Transcode' || utAutoSwitching || utAutoAttempted || utHlsLoading || !$('player').open)return;
 if(utAutoItemId!==p.itemId){utAutoItemId=p.itemId;utAutoAttempted=false;}
 utAutoAttempted=true;utAutoSwitching=true;utClearAutoTimer();
 utHlsStatus.textContent=reason+'. Switching to Jellyfin HLS…';
 try{await utStartHls();}
 catch(e){utHlsStatus.textContent='Automatic HLS failed: '+e.message;}
 finally{utAutoSwitching=false;}
}
// The original v1.5 player remains the default. Guard against fatal HLS errors retrying forever.
$('videoPlayer').addEventListener('error',()=>{
 const p=activePlayback;
 if(p && p.playMethod!=='Transcode' && !utAutoAttempted){utTryAutoHls('Direct playback error');}
});
$('videoPlayer').addEventListener('loadstart',()=>{
 const p=activePlayback;
 if(!p || p.playMethod==='Transcode' || utAutoSwitching)return;
 if(utAutoItemId!==p.itemId){utAutoItemId=p.itemId;utAutoAttempted=false;}
 utArmAutoTimer();
});
$('videoPlayer').addEventListener('playing',utClearAutoTimer);
$('videoPlayer').addEventListener('emptied',utClearAutoTimer);
const utStopV16=stopPlayer;
stopPlayer=function(){utClearAutoTimer();utAutoItemId=null;utAutoAttempted=false;return utStopV16();};
/* UT_AUTO_HLS_V16_END */



/* UT_EMBEDDED_SUB_FIX_V181: bind source + selected subtitle; burn embedded subtitles into HLS. */
function ut18ShouldBurn(){
 const s=ut18MediaStreams.find(x=>x.Type==='Subtitle'&&x.Index===ut18SubtitleIndex);
 return Boolean(s&&!s.IsExternal);
}
function ut18HlsProfile(){
 const profile=utHlsProfile();
 if(ut18ShouldBurn())profile.SubtitleProfiles=[];
 return profile;
}
/* UT_TRACKS_V18_START: Jellyfin-aware audio/subtitle selection */
const ut18StoreKey='utv18-language-preferences';
let ut18Prefs={};
try{ut18Prefs=JSON.parse(localStorage.getItem(ut18StoreKey)||'{}')||{};}catch(e){ut18Prefs={};}
let ut18AudioIndex=null,ut18SubtitleIndex=-1,ut18MediaStreams=[];
let ut18ChangeBusy=false;
function ut18Save(){try{localStorage.setItem(ut18StoreKey,JSON.stringify(ut18Prefs));}catch(e){}}
function ut18MatchSelection(streams,type,lang){return streams.find(s=>s.Type===type && (s.Language||'').toLowerCase()===lang)?.Index;}
function ut18ApplyExternalSubtitle(){
 const v=$('videoPlayer');
 for(const t of [...v.querySelectorAll('track[data-ut]')])t.remove();
 if(ut18SubtitleIndex<0)return;
 const s=ut18MediaStreams.find(x=>x.Type==='Subtitle'&&x.Index===ut18SubtitleIndex);
 const p=activePlayback;
 if(!s?.IsExternal||s.IsTextSubtitleStream===false||!p)return;
 const url=new URL(base+'/Videos/'+encodeURIComponent(p.itemId)+'/'+encodeURIComponent(p.mediaSourceId)+'/Subtitles/'+encodeURIComponent(s.Index)+'/Stream.vtt',location.origin);
 url.searchParams.set('api_key',auth.token);
 const tr=document.createElement('track');tr.dataset.ut='1';tr.kind='subtitles';tr.label=utStreamLabel(s);tr.srclang=s.Language||'en';tr.src=url.toString();tr.default=true;
 v.append(tr);tr.addEventListener('load',()=>{try{tr.track.mode='showing';}catch(e){}});
}
async function ut18RefreshTracks(){
 const current=activePlayback, stamp=++utTrackLoadId;
 if(!current)return;
 try{
  const response=await api('/Items/'+encodeURIComponent(current.itemId)+'/PlaybackInfo?'+qs({UserId:auth.userId}),{method:'POST',body:JSON.stringify({UserId:auth.userId,EnableDirectPlay:true,EnableDirectStream:true,EnableTranscoding:true})});
  if(stamp!==utTrackLoadId||activePlayback!==current)return;
  const source=(response.MediaSources||[]).find(s=>s.Id===current.mediaSourceId)||(response.MediaSources||[])[0];
  ut18MediaStreams=source?.MediaStreams||[];
  const audio=ut18MediaStreams.filter(s=>s.Type==='Audio');
  const subs=ut18MediaStreams.filter(s=>s.Type==='Subtitle');
  // At the beginning of a new title use remembered languages, if available.
  const prev=ut18AudioIndex;
  if(prev===null&&ut18Prefs.audioLang)ut18AudioIndex=ut18MatchSelection(audio,'Audio',ut18Prefs.audioLang)??null;
  if(ut18SubtitleIndex===-1&&ut18Prefs.subtitleLang)ut18SubtitleIndex=ut18MatchSelection(subs,'Subtitle',ut18Prefs.subtitleLang)??-1;
  utAudio.replaceChildren();
  utAudio.add(new Option('Default audio',''));
  for(const s of audio)utAudio.add(new Option(utStreamLabel(s),String(s.Index)));
  utAudio.value=ut18AudioIndex===null?'':String(ut18AudioIndex);
  if(utAudio.selectedIndex<0)utAudio.value='';
  utSub.replaceChildren(new Option('Off','-1'));
  for(const s of subs)utSub.add(new Option(utStreamLabel(s)+(s.IsExternal?' (external)':' (embedded)'),String(s.Index)));
  utSub.value=String(ut18SubtitleIndex);
  if(utSub.selectedIndex<0)utSub.value='-1';
  ut18ApplyExternalSubtitle();
  utTrackInfo.textContent='Audio and embedded subtitles use Jellyfin HLS when changed. External text subtitles use WebVTT when available.';
 }catch(e){if(stamp===utTrackLoadId)utTrackInfo.textContent='Track listing failed: '+e.message;}
}
async function ut18ChangeTracks(){
 if(ut18ChangeBusy||!activePlayback)return;
 ut18ChangeBusy=true;
 const sub=ut18MediaStreams.find(s=>s.Type==='Subtitle'&&s.Index===ut18SubtitleIndex);
 ut18ApplyExternalSubtitle();
 // Embedded subtitles and changed audio must be selected at Jellyfin's transcoder.
 try{
  if(ut18AudioIndex!==null || (sub&&!sub.IsExternal)){
   utTrackInfo.textContent='Switching stream through Jellyfin; keeping playback position…';
   await utStartHls();
   utTrackInfo.textContent=ut18ShouldBurn()?'Embedded subtitle burn-in requested from Jellyfin. If no text appears, check the server FFmpeg/transcoding log.':'Track selection requested. Confirm the language/subtitles are correct.';
  }else{
   utTrackInfo.textContent=sub?'External subtitles selected.':'Subtitles off / default audio selected.';
  }
 }finally{ut18ChangeBusy=false;}
}
utAudio.onchange=async()=>{
 ut18AudioIndex=utAudio.value===''?null:Number(utAudio.value);
 const s=ut18MediaStreams.find(x=>x.Type==='Audio'&&x.Index===ut18AudioIndex);
 ut18Prefs.audioLang=s?.Language?.toLowerCase()||'';ut18Save();
 await ut18ChangeTracks();
};
utSub.onchange=async()=>{
 ut18SubtitleIndex=Number(utSub.value);
 const s=ut18MediaStreams.find(x=>x.Type==='Subtitle'&&x.Index===ut18SubtitleIndex);
 ut18Prefs.subtitleLang=s?.Language?.toLowerCase()||'';ut18Save();
 await ut18ChangeTracks();
};
// Override v1.4 refresh and preserve the selections across stream reinitialisation.
utRefreshTracks=ut18RefreshTracks;
const ut18PrevPlay=playItem;
playItem=async function(item){
 ut18AudioIndex=null;ut18SubtitleIndex=-1;ut18MediaStreams=[];
 await ut18PrevPlay(item);
};
$('videoPlayer').addEventListener('playing',()=>{
 if(activePlayback&&!ut18MediaStreams.length)ut18RefreshTracks();
});
/* UT_TRACKS_V18_END */

})();
