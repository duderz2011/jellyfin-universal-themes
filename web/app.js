'use strict';
// Starter companion browser: does not modify files, user metadata or libraries.
const $ = id => document.getElementById(id);
let server='', token='', userId='', genreRecords=[];
const status = (s,bad=false) => { $('status').textContent=s; $('status').className=bad?'error':''; };
async function api(path) {
 const response=await fetch(server+path,{headers:{'X-Emby-Token':token}});
 if(!response.ok) throw Error(`Jellyfin returned HTTP ${response.status}`);
 return response.json();
}
function validUrl(input) {
 const parsed=new URL(input);
 if(!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash)throw Error('Enter a valid Jellyfin http(s) server address');
 return parsed.href.replace(/\/$/,'');
}
async function connect() {
 try {
  server=validUrl($('server').value.trim()); token=$('token').value.trim();
  if(!token)throw Error('Enter your personal access token');
  status('Connecting…');
  const user=await api('/Users/Me'); userId=user.Id;
  const genres=await api(`/Genres?userId=${encodeURIComponent(userId)}&SortBy=SortName&Limit=500`);
  genreRecords=genres.Items||[];
  $('genre').replaceChildren(new Option('All genres',''));
  for(const g of genreRecords) $('genre').add(new Option(g.Name,g.Name));
  $('browse').hidden=false; status(`Connected as ${user.Name}.`); await search();
 }catch(e){status(`${e.message}. If this browser is on another origin, a Jellyfin CORS restriction may also apply.`,true)}
}
async function search(){
 if(!userId)return;
 try{
  status('Loading your library…');
  const query=new URLSearchParams({UserId:userId,Recursive:'true',IncludeItemTypes:$('type').value,SortBy:'SortName',SortOrder:'Ascending',Limit:'100',Fields:'Genres,ProductionYear,Overview'});
  if($('genre').value) query.set('Genres',$('genre').value);
  if($('search').value.trim())query.set('SearchTerm',$('search').value.trim());
  const data=await api(`/Items?${query.toString()}`);
  const results=$('results'); results.replaceChildren();
  for(const item of (data.Items||[])){
   const card=document.createElement('a'); card.className='card';card.target='_blank';card.rel='noopener noreferrer';
   card.href=server+'/web/#/details?id='+encodeURIComponent(item.Id);
   const img=document.createElement('img');img.alt='';img.loading='lazy';
   img.src=server+'/Items/'+encodeURIComponent(item.Id)+'/Images/Primary?maxWidth=350&quality=80';
   // Image requests require token authentication: images may be blocked on cross-origin standalone installations.
   img.addEventListener('error',()=>{img.style.display='none'});
   const title=document.createElement('strong');title.textContent=item.Name;
   const meta=document.createElement('small');meta.textContent=[item.ProductionYear,item.Type].filter(Boolean).join(' · ');
   card.append(img,title,meta); results.append(card);
  }
  status(`Showing ${data.Items?.length||0} of ${data.TotalRecordCount||0} matching titles (up to 100 per search).`);
 }catch(e){status('Search failed: '+e.message,true)}
}
$('connect').addEventListener('click',connect);$('refresh').addEventListener('click',search);
$('genre').addEventListener('change',search);$('type').addEventListener('change',search);
