import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, signOut, updateProfile,
  setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, limit, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCDnFo0XEgjCHS79Q8SiQqW9gPgnha-vNE',
  authDomain: 'fsdfsd-e6f1a.firebaseapp.com',
  projectId: 'fsdfsd-e6f1a',
  storageBucket: 'fsdfsd-e6f1a.firebasestorage.app',
  messagingSenderId: '38899480616',
  appId: '1:38899480616:web:2ce421d8f3f8bd07519d1d',
  measurementId: 'G-GLZY57Y6ST'
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const ADMIN_EMAIL = 'admin@bibun.pl';
const APP_VERSION = '46';
const $ = id => document.getElementById(id);
const esc = (value='') => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const uid = () => crypto.randomUUID();
const tsMs = v => v?.toMillis?.() || (v ? new Date(v).getTime() : 0);
const dateText = v => { const d = v?.toDate?.() || new Date(v || Date.now()); return d.toLocaleString('pl-PL', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
const timeText = v => { const d = v?.toDate?.() || new Date(v || Date.now()); return d.toLocaleTimeString('pl-PL', {hour:'2-digit',minute:'2-digit'}); };

const statuses = {
  online: { label:'Online', symbol:'●', cls:'online' },
  idle: { label:'Bezczynny', symbol:'◐', cls:'idle' },
  dnd: { label:'Nie przeszkadzać', symbol:'⊘', cls:'dnd' },
  invisible: { label:'Niewidoczny', symbol:'○', cls:'invisible' },
  offline: { label:'Offline', symbol:'○', cls:'offline' }
};

const badges = {
  developer: {name:'Developer', description:'Twórca i programista PrivateCord.', symbol:'✦'},
  ceo: {name:'CEO PrivateCord', description:'Założyciel projektu PrivateCord.', symbol:'♛'},
  staff: {name:'Staff', description:'Członek zespołu PrivateCord.', symbol:'◆'},
  moderator: {name:'Moderator', description:'Osoba odpowiedzialna za moderację społeczności.', symbol:'◇'},
  verified: {name:'Zweryfikowany', description:'Profil zweryfikowany przez administrację PrivateCord.', symbol:'✓'},
  partner: {name:'Partner', description:'Oficjalny partner PrivateCord.', symbol:'★'},
  botdev: {name:'Bot Developer', description:'Twórca i administrator bota PrivateCord.', symbol:'⌘'},
  community: {name:'Community', description:'Aktywny członek społeczności PrivateCord.', symbol:'✺'}
};

const permissionMeta = {
  VIEW_CHANNEL:['Wyświetlanie kanału','Pozwala wejść i czytać kanał.'],
  READ_HISTORY:['Historia wiadomości','Pozwala czytać wcześniejsze wiadomości.'],
  SEND_MESSAGES:['Wysyłanie wiadomości','Pozwala pisać w kanale.'],
  ATTACH_FILES:['Załączniki','Pozwala przesyłać pliki i obrazy.'],
  EMBED_LINKS:['Osadzanie linków','Pozwala wyświetlać podglądy linków.'],
  ADD_REACTIONS:['Dodawanie reakcji','Pozwala reagować na wiadomości.'],
  CREATE_THREADS:['Tworzenie wątków','Pozwala tworzyć wątki przy wiadomościach.'],
  MANAGE_THREADS:['Zarządzanie wątkami','Pozwala moderować wątki.'],
  MANAGE_MESSAGES:['Zarządzanie wiadomościami','Usuwanie i przypinanie wiadomości innych osób.'],
  MANAGE_SERVER:['Zarządzanie serwerem','Edycja ustawień serwera i jego konfiguracji.'],
  MANAGE_CHANNELS:['Zarządzanie kanałami','Tworzenie i edycja kanałów.'],
  MANAGE_ROLES:['Zarządzanie rolami','Tworzenie, edycja i przydzielanie ról.'],
  MANAGE_MEMBERS:['Zarządzanie członkami','Zarządzanie członkami serwera.'],
  KICK_MEMBERS:['Wyrzucanie członków','Usuwanie członków z serwera.'],
  BAN_MEMBERS:['Banowanie','Blokowanie dostępu do serwera.'],
  MANAGE_INVITES:['Zarządzanie zaproszeniami','Tworzenie i odwoływanie zaproszeń.'],
  MENTION_EVERYONE:['@everyone / @here','Pozwala oznaczać wszystkich.'],
  USE_EXTERNAL_EMOJIS:['Zewnętrzne emoji','Korzystanie z emoji spoza serwera.'],
  ADMINISTRATOR:['Administrator','Pełny dostęp do wszystkich funkcji serwera.']
};
const permissionGroups = {
  'Serwer':['MANAGE_SERVER'],
  'Kanały':['VIEW_CHANNEL','READ_HISTORY','SEND_MESSAGES','ATTACH_FILES','EMBED_LINKS','ADD_REACTIONS','CREATE_THREADS','MANAGE_THREADS'],
  'Moderacja':['MANAGE_MESSAGES','MANAGE_CHANNELS','MANAGE_ROLES','MANAGE_MEMBERS','KICK_MEMBERS','BAN_MEMBERS','MANAGE_INVITES'],
  'Społeczność':['MENTION_EVERYONE','USE_EXTERNAL_EMOJIS','ADMINISTRATOR']
};

let me = null;
let currentServer = null;
let currentChannel = null;
let currentDMUser = null;
let currentPage = 'home';
let currentProfileUid = null;
let presenceTimer = null;
let heartbeatSession = null;
let serverUnsub = null;
let membersUnsub = null;
let messagesUnsub = null;
let dmsUnsub = null;
let dmConversationUnsub = null;
let friendUnsub = null;
const dmUnreadCounts = new Map();
const dmLiveLatest = new Map();
let cacheUsers = new Map();
let cacheServers = new Map();
let cacheRoles = new Map();
let cacheMembers = new Map();
let modalCleanup = null;
let presenceRefreshTimer = null;
function stopPresenceRefresh(){ clearInterval(presenceRefreshTimer); presenceRefreshTimer=null; }
function startPresenceRefresh(){
  stopPresenceRefresh();
  if(!currentServer)return;
  presenceRefreshTimer=setInterval(()=>refreshCurrentServerPresence(),12000);
}
async function refreshCurrentServerPresence(){
  if(!currentServer)return;
  const arr=cacheMembers.get(currentServer.id)||[];
  await Promise.all(arr.map(async m=>{
    if(!m?.userId||m.isBot)return;
    try{const u=await getUser(m.userId,true);if(u)m.user=u;}catch{}
  }));
  cacheMembers.set(currentServer.id,arr);
  if(!$('membersPane')?.classList.contains('hidden'))renderMembers(arr);
  if(currentChannel)subscribeMessages();
}


function isAdmin() { return me?.email?.toLowerCase() === ADMIN_EMAIL; }
function toast(message, kind='') {
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.textContent = message;
  $('toastLayer').appendChild(node);
  setTimeout(() => node.remove(), 3200);
}
function showAuth(){ $('authView').classList.remove('hidden'); $('appView').classList.add('hidden'); $('loginPane').classList.remove('hidden'); }
function setAuthStatus(text) { $('authStatus').textContent = text || ''; }
function statusOf(u) {
  if (!u) return 'offline';
  const last = tsMs(u.lastSeen);
  const active = !!u.sessionActive && !!last && Date.now() - last < 50000;
  if (!active) return 'offline';
  return u.status || 'online';
}
function tagOf(u) { return `${u?.username || 'user'}#${String(u?.discriminator || '0000').padStart(4,'0')}`; }
function avatarHTML(u,size='md') {
  const s = statusOf(u);
  const inner = u?.avatar ? `<img src="${esc(u.avatar)}" alt="">` : `<span class="avatar-letter">${esc((u?.displayName || u?.username || '?').slice(0,1).toUpperCase())}</span>`;
  return `<span class="avatar avatar-${size}">${inner}<span class="presence-dot presence-${s}"></span></span>`;
}
function badgesHTML(u) {
  return (u?.badges || []).filter(k => badges[k]).map(k => `<span class="badge-item" title="${esc(badges[k].name)} — ${esc(badges[k].description)}"><span class="symbol">${badges[k].symbol}</span><span>${esc(badges[k].name)}</span></span>`).join('');
}
async function getUser(id,force=false){
  if(!id) return null;
  if(!force && cacheUsers.has(id)) return cacheUsers.get(id);
  try{
    if(String(id).startsWith('bot_')){
      const s=await getDoc(doc(db,'botProfiles',id));
      if(s.exists()){
        const u={uid:s.id,...s.data(),isBot:true};
        cacheUsers.set(id,u);
        return u;
      }
    }
    const s=await getDoc(doc(db,'users',id));
    const u=s.exists()?{uid:s.id,...s.data()}:{uid:id,username:'Użytkownik',displayName:'Użytkownik',discriminator:'0000',status:'offline',sessionActive:false,badges:[],friends:[],blocked:[]};
    cacheUsers.set(id,u);
    return u;
  }catch(e){
    console.warn('getUser',id,e);
    const fallback={uid:id,username:'Użytkownik',displayName:'Użytkownik',discriminator:'0000',status:'offline',sessionActive:false,badges:[],friends:[],blocked:[]};
    cacheUsers.set(id,fallback);
    return fallback;
  }
}
async function ensureUser(authUser, requestedName='') {
  const r = doc(db,'users',authUser.uid);
  const s = await getDoc(r);
  if (s.exists()) {
    me = {uid:s.id,...s.data()};
    const patch = {};
    if (!Array.isArray(me.friends)) patch.friends=[];
    if (!Array.isArray(me.blocked)) patch.blocked=[];
    if (!Array.isArray(me.badges)) patch.badges=[];
    if (!me.discriminator) patch.discriminator=String(Math.floor(Math.random()*10000)).padStart(4,'0');
    if (!('usernameChangedAt' in me)) patch.usernameChangedAt=null;
    if (!Number.isInteger(me.createdServerCount)) patch.createdServerCount=0;
    if (!me.status) patch.status='online';
    if (Object.keys(patch).length) { await updateDoc(r,patch); Object.assign(me,patch); }
    cacheUsers.set(me.uid,me);
    return;
  }
  const name = (requestedName || authUser.displayName || 'user').trim().replace(/\s+/g,' ').slice(0,32) || 'user';
  const data = {uid:authUser.uid,email:authUser.email||'',username:name,displayName:name,discriminator:String(Math.floor(Math.random()*10000)).padStart(4,'0'),bio:'',avatar:'',banner:'',status:'online',customStatus:'',activity:'',sessionActive:false,lastSeen:null,presenceSession:'',badges:[],friends:[],blocked:[],usernameChangedAt:null,createdServerCount:0,createdAt:serverTimestamp()};
  await setDoc(r,data);
  me = {...data,uid:authUser.uid};
  cacheUsers.set(me.uid,me);
  await updateProfile(authUser,{displayName:name});
}
function friendlyAuthError(e) {
  const m = e?.code || '';
  return ({
    'auth/invalid-credential':'Nieprawidłowy email lub hasło.',
    'auth/email-already-in-use':'Ten email jest już używany.',
    'auth/weak-password':'Hasło jest zbyt słabe.',
    'auth/invalid-email':'Nieprawidłowy adres email.',
    'auth/too-many-requests':'Za dużo prób. Spróbuj później.'
  })[m] || e?.message || 'Wystąpił błąd.';
}
async function login() {
  const email=$('loginEmail').value.trim(), pass=$('loginPass').value;
  if (!email || !pass) return setAuthStatus('Wpisz email i hasło.');
  $('loginBtn').disabled=true; setAuthStatus('Logowanie…');
  try { await signInWithEmailAndPassword(auth,email,pass); }
  catch(e){ setAuthStatus(friendlyAuthError(e)); }
  finally { $('loginBtn').disabled=false; }
}

async function goOnline(){
  if(!me) return;
  clearInterval(presenceTimer);
  heartbeatSession=uid();
  me.sessionActive=true; me.presenceSession=heartbeatSession; me.lastSeen={toMillis:()=>Date.now()};
  setUserBar();
  await updateDoc(doc(db,'users',me.uid),{sessionActive:true,lastSeen:serverTimestamp(),presenceSession:heartbeatSession});
  presenceTimer=setInterval(async()=>{
    try{
      const now=Date.now();
      me.sessionActive=true;
      me.lastSeen={toMillis:()=>now};
      await updateDoc(doc(db,'users',me.uid),{sessionActive:true,lastSeen:serverTimestamp(),presenceSession:heartbeatSession});
      setUserBar();
      if(currentServer) await refreshCurrentServerPresence();
    }catch{}
  },15000);
}
async function goOffline(){
  clearInterval(presenceTimer); presenceTimer=null;
  if(!me) return;
  try{
    me.sessionActive=false;
    me.lastSeen={toMillis:()=>Date.now()};
    await updateDoc(doc(db,'users',me.uid),{sessionActive:false,lastSeen:serverTimestamp(),presenceSession:''});
    setUserBar();
  }catch{}
}
window.addEventListener('beforeunload',()=>{ if(me && navigator.sendBeacon){ try { localStorage.setItem('privatecord.lastClose',String(Date.now())); }catch{} } });
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&me) goOnline().catch(()=>{}); });

function setUserBar(){
  $('myAvatar').outerHTML=`<span id="myAvatar" class="avatar avatar-md">${me.avatar?`<img src="${esc(me.avatar)}">`:`<span class="avatar-letter">${esc((me.displayName||me.username||'?').slice(0,1).toUpperCase())}</span>`}<span class="presence-dot presence-${statusOf(me)}"></span></span>`;
  $('myName').textContent=me.displayName||me.username; $('myTag').textContent=tagOf(me); $('statusGlyph').textContent=statuses[statusOf(me)].symbol;
}
function cleanRealtime(){ [serverUnsub,membersUnsub,messagesUnsub,dmsUnsub,dmConversationUnsub,friendUnsub].forEach(fn=>{try{fn?.()}catch{}}); serverUnsub=membersUnsub=messagesUnsub=dmsUnsub=dmConversationUnsub=friendUnsub=null; }

async function enterApp(){ $('authView').classList.add('hidden'); $('appView').classList.remove('hidden'); setUserBar(); await goOnline(); subscribeServers(); subscribeDMList(); subscribeFriendRequests(); renderHome(); }
async function subscribeServers(){
  serverUnsub?.();
  const q=query(collection(db,'servers'),where('members','array-contains',me.uid),limit(100));
  serverUnsub=onSnapshot(q,snap=>{
    const arr=snap.docs.map(d=>({id:d.id,...d.data()})); arr.sort((a,b)=>tsMs(a.createdAt)-tsMs(b.createdAt));
    arr.forEach(s=>cacheServers.set(s.id,s));
    $('serverList').innerHTML=arr.map(s=>`<button class="server-icon ${currentServer?.id===s.id?'active':''}" data-server-id="${s.id}" title="${esc(s.name)}">${s.icon?`<img src="${esc(s.icon)}">`:`<span>${esc((s.name||'SV').slice(0,2).toUpperCase())}</span>`}</button>`).join('');
    $('serverList').querySelectorAll('[data-server-id]').forEach(b=>{b.onclick=()=>openServer(b.dataset.serverId);b.oncontextmenu=e=>{e.preventDefault();showContext(e.clientX,e.clientY,serverContextItems(b.dataset.serverId));}});
  },e=>console.error('servers',e));
}
async function openServer(id){
  const sv=cacheServers.get(id)||{id,...(await getDoc(doc(db,'servers',id))).data()}; if(!sv)return;
  currentServer=sv; currentChannel=null; currentDMUser=null; currentPage='server';
  if(currentServer.ownerId===me?.uid || isAdmin()) await syncServerMemberPermissions(id);
  $('homeSidebar').classList.add('hidden'); $('serverSidebar').classList.remove('hidden'); $('membersPane').classList.remove('hidden'); startPresenceRefresh();
  $('serverNameText').textContent=sv.name||'Serwer'; $('serverDescText').textContent=sv.description||''; $('serverBannerImage').style.backgroundImage=sv.banner?`url("${sv.banner}")`:'none'; const si=$('serverHeaderIcon'); if(si){si.innerHTML=sv.icon?`<img src="${esc(sv.icon)}" alt="">`:`<span>${esc((sv.name||'SV').slice(0,1).toUpperCase())}</span>`;}
  await loadServerTree(); await subscribeMembers();
  const lastId=localStorage.getItem(`privatecord.lastChannel.${id}`);
  let target=null;
  if(lastId){const s=await getDoc(doc(db,'channels',lastId));if(s.exists()&&s.data().serverId===id)target=s;}
  if(!target){
    const snap=await getDocs(query(collection(db,'channels'),where('serverId','==',id),limit(200)));
    const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.archived).sort((a,b)=>(a.position??0)-(b.position??0));
    target=rows[0]?{id:rows[0].id,data:()=>rows[0]}:null;
  }
  if(target) await openChannel(target.id); else renderServerWelcome();
  renderTop();
}
async function loadServerTree(){
  if(!currentServer)return;
  const [catsSnap,chSnap]=await Promise.all([
    getDocs(query(collection(db,'categories'),where('serverId','==',currentServer.id),limit(100))),
    getDocs(query(collection(db,'channels'),where('serverId','==',currentServer.id),limit(200)))
  ]);
  const cats=catsSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.position??0)-(b.position??0));
  const chs=chSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.position??0)-(b.position??0));
  const el=$('channelTree'); el.innerHTML='';
  const catMap=new Map(cats.map(c=>[c.id,[]])); const unc=[];
  for(const ch of chs){ if(catMap.has(ch.categoryId))catMap.get(ch.categoryId).push(ch); else unc.push(ch); }
  for(const cat of cats)el.appendChild(renderCategory(cat,catMap.get(cat.id)||[]));
  if(unc.length){const wrap=document.createElement('div');wrap.innerHTML=`<div class="category-row"><span>BEZ KATEGORII</span><div class="cat-actions"><button class="mini" id="uncAdd">+</button></div></div>`;wrap.querySelector('#uncAdd').onclick=e=>{e.stopPropagation();channelModal({categoryId:null})};el.appendChild(wrap);const sub=document.createElement('div');sub.className='tree-indent';unc.forEach(ch=>sub.appendChild(renderChannel(ch)));el.appendChild(sub);}
}
function renderCategory(cat,channels){
  const wrap=document.createElement('div');
  const collapsed=localStorage.getItem(`privatecord.cat.${cat.id}`)==='1';
  const head=document.createElement('div'); head.className='category-row'; head.draggable=true; head.dataset.categoryId=cat.id;
  head.innerHTML=`<span class="cat-chevron">${collapsed?'▸':'▾'}</span><span class="category-name">${esc(cat.name)}</span><span class="cat-actions"><button class="mini cat-add" title="Utwórz kanał">+</button><button class="mini cat-menu" title="Opcje kategorii">⋯</button></span>`;
  head.onclick=()=>{localStorage.setItem(`privatecord.cat.${cat.id}`,collapsed?'0':'1');loadServerTree()};
  head.oncontextmenu=e=>{e.preventDefault();showContext(e.clientX,e.clientY,categoryContextItems(cat.id));};
  head.ondragstart=e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',JSON.stringify({type:'category',id:cat.id}));head.classList.add('dragging')};
  head.ondragend=()=>head.classList.remove('dragging');
  head.ondragover=e=>{e.preventDefault();head.classList.add('drag-over')}; head.ondragleave=()=>head.classList.remove('drag-over');
  head.ondrop=async e=>{e.preventDefault();head.classList.remove('drag-over');let d={};try{d=JSON.parse(e.dataTransfer.getData('text/plain')||'{}')}catch{};
    if(d.type==='category') await reorderCategory(d.id,cat.id);
    if(d.type==='channel'){const all=await getDocs(query(collection(db,'channels'),where('serverId','==',currentServer.id),limit(500)));const same=all.docs.map(x=>({id:x.id,...x.data()})).filter(x=>(x.categoryId??null)===cat.id);const max=same.reduce((n,x)=>Math.max(n,Number(x.position??0)), -1);await updateDoc(doc(db,'channels',d.id),{categoryId:cat.id,position:max+1});await loadServerTree();}
  };
  head.querySelector('.cat-add').onclick=e=>{e.stopPropagation();channelModal({categoryId:cat.id})};
  head.querySelector('.cat-menu').onclick=e=>{e.stopPropagation();showContext(e.clientX,e.clientY,categoryContextItems(cat.id));};
  wrap.appendChild(head);
  if(!collapsed){const sub=document.createElement('div');sub.className='tree-indent';channels.sort((a,b)=>(a.position??0)-(b.position??0)).forEach(ch=>sub.appendChild(renderChannel(ch)));wrap.appendChild(sub)}
  return wrap;
}
function renderChannel(ch){
  const b=document.createElement('button'); b.className=`channel-row ${currentChannel?.id===ch.id?'active':''}`;b.draggable=true;b.dataset.channelId=ch.id;
  b.innerHTML=`<span class="hash">#</span><span class="channel-label">${esc(ch.name)}</span>${ch.syncWithCategory?'<span class="sync-dot">≋</span>':''}`;
  b.onclick=()=>openChannel(ch.id);b.oncontextmenu=e=>{e.preventDefault();showContext(e.clientX,e.clientY,channelContextItems(ch.id));};
  b.ondragstart=e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',JSON.stringify({type:'channel',id:ch.id}));b.classList.add('dragging')};
  b.ondragend=()=>b.classList.remove('dragging');
  b.ondragover=e=>{e.preventDefault();b.classList.add('drag-over')};b.ondragleave=()=>b.classList.remove('drag-over');
  b.ondrop=async e=>{e.preventDefault();b.classList.remove('drag-over');let d={};try{d=JSON.parse(e.dataTransfer.getData('text/plain')||'{}')}catch{};if(d.type==='channel')await reorderChannel(d.id,ch.id)};
  return b;
}
async function reorderCategory(aid,bid){if(aid===bid)return;const [a,b]=await Promise.all([getDoc(doc(db,'categories',aid)),getDoc(doc(db,'categories',bid))]);if(!a.exists()||!b.exists())return;const batch=writeBatch(db);batch.update(a.ref,{position:b.data().position});batch.update(b.ref,{position:a.data().position});await batch.commit();await loadServerTree();}
async function reorderChannel(aid,bid){
  if(aid===bid)return;
  const all=await getDocs(query(collection(db,'channels'),where('serverId','==',currentServer.id),limit(500)));
  const items=all.docs.map(d=>({id:d.id,...d.data()}));
  const A=items.find(x=>x.id===aid),B=items.find(x=>x.id===bid); if(!A||!B)return;
  const sourceCat=A.categoryId??null,targetCat=B.categoryId??null;
  const batch=writeBatch(db);
  if(sourceCat===targetCat){batch.update(doc(db,'channels',aid),{position:B.position});batch.update(doc(db,'channels',bid),{position:A.position});}
  else{
    const source=items.filter(x=>(x.categoryId??null)===sourceCat&&x.id!==aid).sort((a,b)=>(a.position??0)-(b.position??0));
    const target=items.filter(x=>(x.categoryId??null)===targetCat&&x.id!==aid).sort((a,b)=>(a.position??0)-(b.position??0));
    const idx=target.findIndex(x=>x.id===bid); if(idx<0)return;
    target.splice(idx,0,{...A,categoryId:targetCat,position:B.position});
    source.forEach((x,i)=>batch.update(doc(db,'channels',x.id),{position:i}));
    target.forEach((x,i)=>{if(x.id===aid)batch.update(doc(db,'channels',aid),{categoryId:targetCat,position:i});else if(x.id!==bid||i!==idx)batch.update(doc(db,'channels',x.id),{position:i})});
  }
  await batch.commit();await loadServerTree();
}
async function ensureChannelPermissionMeta(id, data){
  if(!currentServer || (!isAdmin() && currentServer.ownerId!==me.uid)) return data;
  const hasMeta=data && data.permissionDenyRoles && data.permissionAllowRoles && data.permissionDenyEveryone && data.permissionAllowEveryone;
  if(hasMeta) return data;
  try{
    const roles=await getServerRoles();
    const meta=buildSendPermissionMeta(data.permissionOverwrites||{},roles);
    await updateDoc(doc(db,'channels',id),meta);
    return {...data,...meta};
  }catch{return data;}
}

async function openChannel(id){
  const snap=await getDoc(doc(db,'channels',id));if(!snap.exists())return;
  let d=snap.data();if(d.serverId!==currentServer?.id)return;
  d=await ensureChannelPermissionMeta(id,d);
  if(!(await effectivePermission('VIEW_CHANNEL',d))){toast('Nie masz dostępu do tego kanału.','error');return;}
  currentChannel={id:snap.id,...d};localStorage.setItem(`privatecord.lastChannel.${currentServer.id}`,id);renderTop();subscribeMessages();loadServerTree();
  setTimeout(()=>applyComposerPermissionState(),0);
}
function renderServerWelcome(){currentChannel=null;$('mainContent').innerHTML=`<div class="home-page"><div class="hero-card"><h1>${esc(currentServer.name)}</h1><p>${esc(currentServer.description||'Witaj na serwerze.')}</p><p class="muted">Utwórz kategorię lub kanał z menu prawego przycisku.</p></div></div>`;}
function renderTop(){
  if(currentPage==='server'&&currentServer){$('topIcon').textContent='#';$('topTitle').textContent=currentChannel?.name||currentServer.name;$('topSubtitle').textContent=currentChannel?.topic||currentServer.description||'';return;}
  if(currentPage==='dm'&&currentDMUser){$('topIcon').textContent='@';$('topTitle').textContent=currentDMUser.displayName||currentDMUser.username;$('topSubtitle').textContent='Wiadomość bezpośrednia';return;}
  const map={home:['⌂','Strona główna',''],friends:['♧','Znajomi',''],discover:['◎','Odkrywaj',''],bots:['◈','Boty',''],settings:['⚙','Ustawienia','']};const x=map[currentPage]||map.home;$('topIcon').textContent=x[0];$('topTitle').textContent=x[1];$('topSubtitle').textContent=x[2];
}

async function subscribeMembers(){
  membersUnsub?.();
  if(!currentServer) return;

  // Seed the cache immediately from the server's members[] array so @mention
  // autocomplete works even before the realtime membership snapshot arrives.
  const seeded=[];
  for(const uidValue of (currentServer.members||[])){
    try{
      const u=await getUser(uidValue);
      if(u) seeded.push({id:`${currentServer.id}_${uidValue}`,serverId:currentServer.id,userId:uidValue,roleIds:[],nickname:'',timeoutUntil:null,joinedAt:null,user:u});
    }catch(e){console.warn('seed member',e)}
  }
  cacheMembers.set(currentServer.id,seeded);

  try{
    const rs=await getDocs(query(collection(db,'serverRoles'),where('serverId','==',currentServer.id),limit(200)));
    cacheRoles=new Map([...cacheRoles.entries()].filter(([k,v])=>v.serverId!==currentServer.id));
    rs.docs.forEach(d=>cacheRoles.set(d.id,{id:d.id,...d.data()}));
  }catch(e){console.warn('roles',e)}

  return await new Promise(resolve=>{
    let settled=false;
    const finish=()=>{if(!settled){settled=true;resolve();}};
    const q=query(collection(db,'serverMembers'),where('serverId','==',currentServer.id),limit(1000));
    membersUnsub=onSnapshot(q,async snap=>{
      const byUser=new Map();
      // Always keep legacy members[] entries, so old servers work too.
      for(const uidValue of (currentServer.members||[])){
        const existing=seeded.find(x=>x.userId===uidValue);
        if(existing) byUser.set(uidValue,existing);
      }
      for(const d of snap.docs){
        const x=d.data();
        if(!x.userId)continue;
        try{byUser.set(x.userId,{id:d.id,...x,user:await getUser(x.userId)});}catch(e){console.warn('member user',e)}
      }
      try{
        const bs=await getDocs(query(collection(db,'botInstallations'),where('serverId','==',currentServer.id),where('enabled','==',true),limit(200)));
        for(const d of bs.docs){
          const x=d.data();
          if(x.botUserId){
            try{byUser.set(x.botUserId,{id:d.id,serverId:currentServer.id,userId:x.botUserId,roleIds:x.roleIds||[],nickname:x.nickname||'',isBot:true,user:await getUser(x.botUserId)});}catch(e){console.warn('bot member',e)}
          }
        }
      }catch(e){console.warn('bot installations',e)}
      const arr=[...byUser.values()].filter(x=>x.user).sort((a,b)=>String(a.user?.displayName||a.user?.username||'').localeCompare(String(b.user?.displayName||b.user?.username||''),'pl'));
      cacheMembers.set(currentServer.id,arr);
      if(!$('membersPane')?.classList.contains('hidden')) renderMembers(arr);
      // When the first member snapshot lands, re-render the current channel so
      // existing @mentions resolve immediately as clickable profile buttons.
      if(settled===false && currentChannel) subscribeMessages();
      finish();
    },e=>{
      console.error('members',e);
      if(cacheMembers.get(currentServer.id)?.length && currentChannel) subscribeMessages();
      toast('Nie udało się wczytać listy członków','error');
      finish();
    });
  });
}
function roleForMember(serverId,userId){
  const m=(cacheMembers.get(serverId)||[]).find(x=>x.userId===userId);
  const roles=(m?.roleIds||[]).map(id=>cacheRoles.get(id)).filter(Boolean).filter(r=>!r.isEveryone).sort((a,b)=>(b.position??0)-(a.position??0));
  return roles[0]||null;
}
function memberFor(serverId,userId){return (cacheMembers.get(serverId)||[]).find(x=>x.userId===userId)||null;}
function colorRgba(hex,alpha=.16){
  const h=String(hex||'').replace('#','').trim(); if(!/^[0-9a-f]{6}$/i.test(h))return `rgba(88,101,242,${alpha})`;
  const n=parseInt(h,16),r=(n>>16)&255,g=(n>>8)&255,b=n&255; return `rgba(${r},${g},${b},${alpha})`;
}
function escapeRegex(value){return String(value||'').replace(/[.*+?^${}()|[\[\]\\]/g,'\\$&');}
function mentionableRoles(){return [...cacheRoles.values()].filter(r=>r.serverId===currentServer?.id && r.mentionable && !r.isEveryone).sort((a,b)=>String(a.name||'').length-String(b.name||'').length);}
function wireRoleMentionPicker(input){
  if(!input)return;
  const old=document.getElementById('roleMentionPicker'); if(old)old.remove();
  const picker=document.createElement('div'); picker.id='roleMentionPicker'; picker.className='role-mention-picker hidden'; input.parentElement?.parentElement?.appendChild(picker);
  const close=()=>picker.classList.add('hidden');
  const render=()=>{
    if(!currentServer){close();return;}
    const m=input.value.match(/@&([A-Za-z0-9_-]*)$/); if(!m){close();return;}
    const term=(m[1]||'').toLowerCase(); const roles=mentionableRoles().filter(r=>String(r.name||'').toLowerCase().includes(term)).slice(0,8);
    if(!roles.length){close();return;}
    picker.innerHTML=`<div class="role-mention-title">Role do oznaczenia</div>${roles.map(r=>`<button type="button" class="role-mention-option" data-role-mention="${esc(r.name)}"><span class="role-mention-swatch" style="background:${esc(r.color||'#5865f2')}"></span><span>${esc(r.name)}</span><small>${esc(r.name)}</small></button>`).join('')}`;
    picker.classList.remove('hidden');
    picker.querySelectorAll('[data-role-mention]').forEach(b=>b.onclick=()=>{const name=b.dataset.roleMention||'';const start=input.selectionStart??input.value.length;const before=input.value.slice(0,start).replace(/@&([A-Za-z0-9_-]*)$/,'');input.value=before+'@&'+name+' ';input.focus();input.selectionStart=input.selectionEnd=input.value.length;close()});
  };
  input.addEventListener('input',render); input.addEventListener('blur',()=>setTimeout(close,150)); input.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
}

function renderMembers(arr){
  const host=$('membersList'); if(!host)return;
  const q=(($('memberSearch')?.value)||'').trim().toLowerCase();
  if($('memberSummary')) $('memberSummary').textContent=`${arr.length} członków${q?' · filtr aktywny':''}`;
  const filtered=arr.filter(m=>{const u=m.user||{};const hay=`${u.displayName||u.username||''} ${tagOf(u)} ${m.nickname||''}`.toLowerCase();return !q||hay.includes(q)});
  const roles=Array.from(cacheRoles.values()).filter(r=>r.serverId===currentServer?.id).sort((a,b)=>(b.position??0)-(a.position??0));
  const hoist=roles.filter(r=>r.hoist&&!r.isEveryone);
  const assigned=new Set();const groups=[];
  for(const r of hoist){
    const ms=filtered.filter(m=>(m.roleIds||[]).includes(r.id));
    if(ms.length){groups.push({name:r.name,color:r.color,members:ms,roleId:r.id});ms.forEach(m=>assigned.add(m.userId));}
  }
  const online=filtered.filter(m=>!assigned.has(m.userId)&&statusOf(m.user)==='online');
  const otherOnline=filtered.filter(m=>!assigned.has(m.userId)&&['idle','dnd','invisible'].includes(statusOf(m.user)));
  const offline=filtered.filter(m=>!assigned.has(m.userId)&&statusOf(m.user)==='offline');
  if(online.length)groups.unshift({name:`ONLINE`,count:online.length,members:online});
  if(otherOnline.length)groups.push({name:`POZA STANDARDOWYM ONLINE`,count:otherOnline.length,members:otherOnline});
  if(offline.length)groups.push({name:`OFFLINE`,count:offline.length,members:offline});
  const memberCard=m=>{
    const u=m.user||{}; const st=statusOf(u); const role=roleForMember(currentServer?.id,m.userId); const display=m.nickname||u.displayName||u.username||'Użytkownik';
    const roleStyle=role?.color?`color:${esc(role.color)};`:'color:#f2f3f5;';
    const roleLabel=role?`<span class="member-role-pill" style="color:${esc(role.color||'#cbd5e1')};background:${colorRgba(role.color,.16)};border-color:${colorRgba(role.color,.28)}">${esc(role.name)}</span>`:'';
    return `<button class="member-row member-row-rich" data-profile="${esc(m.userId)}" title="${esc(tagOf(u))}"><div class="member-avatar-wrap">${avatarHTML(u,'sm')}</div><span class="member-copy"><span class="member-name-line"><b style="${roleStyle}">${esc(display)}</b>${u.isBot?'<span class="bot-chip">BOT</span>':''}</span><span class="member-meta-row"><small>${esc(tagOf(u))}</small>${roleLabel}<small class="member-status-label">${esc(statuses[st]?.label||'Offline')}</small></span></span></button>`;
  };
  host.innerHTML=groups.map(g=>`<div class="member-group"><div class="member-group-title" style="${g.color?`--group-color:${esc(g.color)}`:''}"><span>${esc(g.name)}</span><span>${g.members.length}</span></div>${g.members.map(memberCard).join('')}</div>`).join('')||'<div class="empty-state">Brak pasujących członków.</div>';
  host.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>openProfile(b.dataset.profile,b));
  host.querySelectorAll('.member-row').forEach(b=>b.oncontextmenu=async e=>{e.preventDefault();showContext(e.clientX,e.clientY,memberContextItems(b.dataset.profile));});
}
function messageHTML(m,prev){
  const same=prev&&prev.uid===m.uid&&tsMs(m.createdAt)-tsMs(prev.createdAt)<300000;
  const sm= currentServer ? memberFor(currentServer.id,m.uid) : null;
  const role= currentServer ? roleForMember(currentServer.id,m.uid) : null;
  const authorName=sm?.nickname||m.user.displayName||m.user.username||'Użytkownik';
  const authorColor=role?.color||'';
  const body=`${m.replyTo?`<div class="reply-block">↳ ${esc(m.replyPreview||'Odpowiedź')}</div>`:''}<div class="message-text">${formatText(m.content||'')}</div>${attachmentsHTML(m.attachments)}${reactionsHTML(m)}`;
  const actions=`<div class="message-actions"><button data-msg-action="reply" data-id="${m.id}">↩</button><button data-msg-action="react" data-id="${m.id}" title="Reaguj kciukiem w górę">👍</button><button data-msg-action="pin" data-id="${m.id}">⌑</button>${m.uid===me.uid?`<button data-msg-action="edit" data-id="${m.id}">Edytuj</button><button data-msg-action="delete" data-id="${m.id}">Usuń</button>`:''}</div>`;
  if(same)return `<div class="message-row cont" data-message-id="${m.id}"><div class="message-avatar-spacer"></div><div class="message-body">${actions}${body}</div></div>`;
  return `<div class="message-row" data-message-id="${m.id}">${avatarHTML(m.user,'sm')}<div class="message-body"><div class="message-meta"><button class="message-author" style="${authorColor?`color:${esc(authorColor)};`:''}" data-profile="${m.uid}">${esc(authorName)}</button>${role?`<span class="message-role-tag" style="color:${esc(role.color||'#cbd5e1')};background:${colorRgba(role.color,.14)};border-color:${colorRgba(role.color,.24)}">${esc(role.name)}</span>`:''}${m.user.badges?.length?'<span class="tiny-badge">✦</span>':''}<time>${dateText(m.createdAt)}</time>${m.editedAt?'<small class="muted">(edytowano)</small>':''}</div>${actions}${body}</div></div>`;
}
function currentServerMembersForMentions(){
  return (cacheMembers.get(currentServer?.id)||[]).map(m=>m.user).filter(Boolean);
}
function mentionUsers(){
  const map=new Map();
  for(const u of currentServerMembersForMentions()) if(u?.uid) map.set(u.uid,u);
  // Always include the current user and any legacy members that have already been cached.
  if(me?.uid&&!map.has(me.uid)) map.set(me.uid,me);
  return [...map.values()];
}
function userMentionHTML(uidValue){
  const u=mentionUsers().find(x=>x.uid===uidValue);
  if(!u) return null;
  const member=memberFor(currentServer?.id,uidValue);
  const name=member?.nickname||u.displayName||u.username||'Użytkownik';
  const role=roleForMember(currentServer?.id,uidValue);
  const color=role?.color||'#9ca7ff';
  return `<button type="button" class="member-mention" data-profile="${esc(uidValue)}" style="color:${esc(color)};background:${colorRgba(color,.14)};border-color:${colorRgba(color,.28)}">@${esc(name)}</button>`;
}
function wireMentionPicker(input){
  if(!input || input.dataset.mentionPickerBound)return;
  input.dataset.mentionPickerBound='1';
  const old=document.getElementById('mentionPicker'); if(old)old.remove();
  const picker=document.createElement('div');
  picker.id='mentionPicker';
  picker.className='role-mention-picker hidden mention-picker';
  input.parentElement?.parentElement?.appendChild(picker);
  let options=[];
  let activeIndex=0;
  const close=()=>{picker.classList.add('hidden');options=[];activeIndex=0};
  const insertMention=(u)=>{
    const pos=input.selectionStart??input.value.length;
    const left=input.value.slice(0,pos);
    const m=left.match(/(^|[\s(])@([^@\s]*)$/u);
    if(!m)return;
    const prefix=left.slice(0,left.length-m[0].length)+(m[1]||'');
    const token=`<@${u.uid}> `;
    const right=input.value.slice(pos);
    input.value=prefix+token+right;
    const next=prefix.length+token.length;
    input.focus();
    input.selectionStart=input.selectionEnd=next;
    close();
    input.dispatchEvent(new Event('input',{bubbles:true}));
  };
  const paint=()=>{
    if(!currentServer){close();return;}
    const pos=input.selectionStart??input.value.length;
    const left=input.value.slice(0,pos);
    const m=left.match(/(^|[\s(])@([^@\s]*)$/u);
    if(!m || m[2].startsWith('&')){close();return;}
    const term=(m[2]||'').toLowerCase();
    options=mentionUsers().filter(u=>{
      const member=memberFor(currentServer.id,u.uid);
      const name=(member?.nickname||u.displayName||u.username||'').toLowerCase();
      const tag=tagOf(u).toLowerCase();
      return !term || name.includes(term) || tag.includes(term);
    }).sort((a,b)=>{
      const an=memberFor(currentServer.id,a.uid)?.nickname||a.displayName||a.username||'';
      const bn=memberFor(currentServer.id,b.uid)?.nickname||b.displayName||b.username||'';
      return an.localeCompare(bn,'pl');
    }).slice(0,8);
    if(!options.length){close();return;}
    activeIndex=0;
    picker.innerHTML=`<div class="role-mention-title">Członkowie serwera</div>${options.map((u,i)=>{
      const member=memberFor(currentServer.id,u.uid);
      const name=member?.nickname||u.displayName||u.username||'Użytkownik';
      const role=roleForMember(currentServer.id,u.uid);
      return `<button type="button" class="mention-option ${i===0?'active':''}" data-mention-user="${esc(u.uid)}"><span class="mention-avatar">${avatarHTML(u,'xs')}</span><span class="mention-copy"><b style="${role?.color?`color:${esc(role.color)};`:''}">${esc(name)}</b><small>${esc(tagOf(u))}</small></span></button>`;
    }).join('')}`;
    picker.classList.remove('hidden');
    picker.querySelectorAll('[data-mention-user]').forEach((b,i)=>{b.onclick=()=>insertMention(options[i]);});
  };
  const move=(dir)=>{
    if(!options.length)return;
    activeIndex=(activeIndex+dir+options.length)%options.length;
    picker.querySelectorAll('.mention-option').forEach((b,i)=>b.classList.toggle('active',i===activeIndex));
    picker.querySelectorAll('.mention-option')[activeIndex]?.scrollIntoView({block:'nearest'});
  };
  input.addEventListener('input',paint);
  input.addEventListener('keydown',e=>{
    if(picker.classList.contains('hidden'))return;
    if(e.key==='ArrowDown'){e.preventDefault();move(1)}
    else if(e.key==='ArrowUp'){e.preventDefault();move(-1)}
    else if(e.key==='Enter'&&!e.shiftKey&&options.length){e.preventDefault();insertMention(options[activeIndex])}
    else if(e.key==='Escape')close();
  });
  input.addEventListener('blur',()=>setTimeout(close,160));
  document.addEventListener('mousedown',e=>{if(!picker.contains(e.target)&&e.target!==input)close();},{passive:true});
}
function formatText(t){
  let raw=String(t||'');
  const userPlaceholders=[];
  raw=raw.replace(/<@([A-Za-z0-9_-]+)>/g,(full,id)=>{
    const html=userMentionHTML(id);
    if(!html)return full;
    const token=`__KJUSER_${userPlaceholders.length}__`;
    userPlaceholders.push(html);
    return token;
  });
  let x=esc(raw);
  x=x.replace(/```([\s\S]*?)```/g,'<pre class="md-codeblock"><code>$1</code></pre>');
  x=x.replace(/^###\s+(.+)$/gm,'<div class="md-h3">$1</div>');
  x=x.replace(/^##\s+(.+)$/gm,'<div class="md-h2">$1</div>');
  x=x.replace(/^#\s+(.+)$/gm,'<div class="md-h1">$1</div>');
  x=x.replace(/\|\|(.+?)\|\|/g,'<span class="md-spoiler">$1</span>');
  x=x.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  x=x.replace(/__(.+?)__/g,'<u>$1</u>');
  x=x.replace(/~~(.+?)~~/g,'<s>$1</s>');
  x=x.replace(/`([^`]+)`/g,'<code class="md-inline-code">$1</code>');
  x=x.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?:])/g,'$1<em>$2</em>');
  const roles=mentionableRoles();
  const rolePlaceholders=[];
  if(roles.length){
    const names=roles.map(r=>escapeRegex(r.name)).sort((a,b)=>b.length-a.length);
    const roleRe=new RegExp(`@&(${names.join('|')})(?=$|[\s.,!?;:)])`,'gi');
    x=x.replace(roleRe,(full,name)=>{
      const r=roles.find(rr=>String(rr.name).toLowerCase()===String(name).toLowerCase());
      const token=`__KJROLE_${rolePlaceholders.length}__`;
      rolePlaceholders.push(`<span class="role-mention" style="color:${esc(r?.color||'#aeb7ff')};background:${colorRgba(r?.color,.16)};border-color:${colorRgba(r?.color,.28)}">@${esc(r?.name||name)}</span>`);
      return token;
    });
  }
  rolePlaceholders.forEach((html,i)=>{x=x.replace(`__KJROLE_${i}__`,html)});
  userPlaceholders.forEach((html,i)=>{x=x.replace(`__KJUSER_${i}__`,html)});
  return x.replace(/\n/g,'<br>');
}
function attachmentsHTML(a=[]){return (a||[]).map(x=>x.type?.startsWith('image/')?`<a href="${esc(x.url)}" target="_blank"><img class="attachment-img" src="${esc(x.url)}"></a>`:x.kind==='firestore-file'?`<button type="button" class="attachment-file" data-download-file="${esc(x.fileId||'')}" data-file-name="${esc(x.name||'plik.pdf')}"><span class="file-icon">PDF</span><span><b>${esc(x.name||'plik.pdf')}</b><small>${x.size?Math.max(1,Math.round(Number(x.size)/1024))+' KB':'plik PDF'} · Pobierz</small></span></button>`:`<a class="attachment-file" href="${esc(x.url||'#')}" target="_blank">📎 ${esc(x.name||'plik')}</a>`).join('')}
function reactionsHTML(m){const r=m.reactions||{};const rows=Object.entries(r).map(([em,users])=>`<button class="reaction ${(users||[]).includes(me.uid)?'active':''}" data-react="${m.id}" data-emoji="${esc(em)}">${esc(em)} <span>${Array.isArray(users)?users.length:0}</span></button>`).join('');return rows?`<div class="reactions">${rows}</div>`:''}
async function getAuthor(id){
  if(String(id||'').startsWith('bot_')) return getUser(id);
  return getUser(id);
}

async function subscribeMessages(){
  messagesUnsub?.();if(!currentChannel)return;
  const q=query(collection(db,'messages'),where('channelId','==',currentChannel.id),limit(300));
  messagesUnsub=onSnapshot(q,async snap=>{
    const rows=await Promise.all(snap.docs.map(async d=>{const x=d.data();return {id:d.id,...x,user:await getAuthor(x.uid)}}));
    rows.sort((a,b)=>tsMs(a.createdAt)-tsMs(b.createdAt));
    renderChat(rows);
  },e=>toast('Nie udało się wczytać wiadomości: '+(e.message||e),'error'));
}

function hasPermissionInRoles(permission, roles){
  return roles.some(r=>Array.isArray(r.permissions)&&r.permissions.includes('ADMINISTRATOR')) || roles.some(r=>Array.isArray(r.permissions)&&r.permissions.includes(permission));
}
async function hasServerPermission(permission, serverId=currentServer?.id, userId=me?.uid){
  if(!serverId||!userId)return false;
  if(userId===me?.uid && (isAdmin() || currentServer?.ownerId===userId))return true;
  try{
    const sv=currentServer?.id===serverId?currentServer:(await getDoc(doc(db,'servers',serverId))).data();
    if(!sv)return false;
    if(sv.ownerId===userId || (me?.email||'').toLowerCase()===ADMIN_EMAIL)return true;
    const md=await getDoc(doc(db,'serverMembers',`${serverId}_${userId}`));
    if(!md.exists())return false;
    const mem=md.data();
    if(Array.isArray(mem.serverPermissions) && (mem.serverPermissions.includes('ADMINISTRATOR') || mem.serverPermissions.includes(permission)))return true;
    const roleIds=new Set(mem.roleIds||[]);
    const rolesSnap=await getDocs(query(collection(db,'serverRoles'),where('serverId','==',serverId),limit(200)));
    const roles=rolesSnap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.isEveryone||roleIds.has(r.id));
    return hasPermissionInRoles(permission,roles);
  }catch(e){console.warn('server permission check',e);return false;}
}
async function computeServerPermissions(serverId, roleIds){
  const snap=await getDocs(query(collection(db,'serverRoles'),where('serverId','==',serverId),limit(200)));
  const ids=new Set(roleIds||[]); const perms=new Set();
  snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.isEveryone||ids.has(r.id)).forEach(r=>(r.permissions||[]).forEach(x=>perms.add(x)));
  if(perms.has('ADMINISTRATOR'))perms.add('ADMINISTRATOR');
  return [...perms];
}
async function syncServerMemberPermissions(serverId){
  if(!currentServer || currentServer.id!==serverId || !(isAdmin()||currentServer.ownerId===me?.uid))return;
  try{
    const snap=await getDocs(query(collection(db,'serverMembers'),where('serverId','==',serverId),limit(500)));
    const rolesSnap=await getDocs(query(collection(db,'serverRoles'),where('serverId','==',serverId),limit(200)));
    const roles=rolesSnap.docs.map(d=>({id:d.id,...d.data()})); const batch=writeBatch(db);
    for(const md of snap.docs){ const mem=md.data(); const ids=new Set(mem.roleIds||[]); const perms=new Set(); roles.filter(r=>r.isEveryone||ids.has(r.id)).forEach(r=>(r.permissions||[]).forEach(x=>perms.add(x))); if(perms.has('ADMINISTRATOR'))perms.add('ADMINISTRATOR'); batch.update(md.ref,{serverPermissions:[...perms],permissionsSyncedAt:serverTimestamp()}); }
    if(snap.size)await batch.commit();
  }catch(e){console.warn('sync server permissions',e)}
}
async function getCurrentServerMember(){
  if(!currentServer||!me)return null;
  const cached=memberFor(currentServer.id,me.uid);
  if(cached&&Array.isArray(cached.roleIds))return cached;
  try{
    const s=await getDoc(doc(db,'serverMembers',`${currentServer.id}_${me.uid}`));
    if(s.exists()){
      const x={id:s.id,...s.data(),user:me};
      const arr=cacheMembers.get(currentServer.id)||[];
      const i=arr.findIndex(m=>m.userId===me.uid);
      if(i>=0)arr[i]=x;else arr.push(x);
      cacheMembers.set(currentServer.id,arr);
      return x;
    }
  }catch(e){console.warn('current member',e)}
  return {userId:me.uid,roleIds:[],nickname:'',timeoutUntil:null,user:me};
}
async function getServerRoles(){
  if(!currentServer)return [];
  const cached=[...cacheRoles.values()].filter(r=>r.serverId===currentServer.id);
  if(cached.length)return cached;
  try{
    const snap=await getDocs(query(collection(db,'serverRoles'),where('serverId','==',currentServer.id),limit(200)));
    const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
    rows.forEach(r=>cacheRoles.set(r.id,r));
    return rows;
  }catch{return []}
}
async function effectivePermission(permission,channelData=currentChannel){
  if(!me||!currentServer||!channelData)return false;
  if(currentServer.ownerId===me.uid||isAdmin())return true;
  const member=await getCurrentServerMember();
  if(!member)return false;
  const timeout=tsMs(member.timeoutUntil);
  if(timeout&&timeout>Date.now())return false;
  const roles=await getServerRoles();
  const assigned=new Set(member.roleIds||[]);
  const ownRoles=roles.filter(r=>r.isEveryone||assigned.has(r.id));
  let granted=ownRoles.some(r=>Array.isArray(r.permissions)&&r.permissions.includes('ADMINISTRATOR'));
  if(granted)return true;
  granted=ownRoles.some(r=>Array.isArray(r.permissions)&&r.permissions.includes(permission));
  let overwrites=channelData.permissionOverwrites||{};
  if(channelData.syncWithCategory&&channelData.categoryId){
    try{
      const c=await getDoc(doc(db,'categories',channelData.categoryId));
      if(c.exists())overwrites=c.data().permissionOverwrites||overwrites;
    }catch{}
  }
  const everyone=roles.find(r=>r.isEveryone);
  if(everyone){
    const ov=overwrites[everyone.id];
    const v=ov&&typeof ov[permission]==='number'?ov[permission]:0;
    if(v===-1)granted=false;
    if(v===1)granted=true;
  }
  let roleAllow=false,roleDeny=false;
  for(const r of ownRoles){
    if(r.isEveryone)continue;
    const ov=overwrites[r.id];
    const v=ov&&typeof ov[permission]==='number'?ov[permission]:0;
    if(v===1)roleAllow=true;
    if(v===-1)roleDeny=true;
  }
  if(roleDeny&&!roleAllow)granted=false;
  if(roleAllow)granted=true;
  return !!granted;
}
async function applyComposerPermissionState(){
  const input=$('messageInput'),send=$('sendBtn'),attach=$('attachBtn');
  if(!input)return;
  try{
    const canSend=await effectivePermission('SEND_MESSAGES',currentChannel);
    const canAttach=canSend&&await effectivePermission('ATTACH_FILES',currentChannel);
    input.disabled=!canSend;
    if(send)send.disabled=!canSend;
    if(attach)attach.disabled=!canAttach;
    input.placeholder=canSend?`Napisz wiadomość na #${currentChannel?.name||'kanale'}`:'Nie możesz wysyłać wiadomości na tym kanale.';
    input.classList.toggle('composer-locked',!canSend);
  }catch{
    input.disabled=true;if(send)send.disabled=true;if(attach)attach.disabled=true;
    input.placeholder='Nie możesz wysyłać wiadomości na tym kanale.';
  }
}

function renderChat(msgs){
  $('mainContent').innerHTML=`<div class="chat"><div id="chatScroll" class="chat-scroll"><div class="chat-header-empty">Witaj na <b>#${esc(currentChannel?.name||'kanale')}</b>. To początek rozmowy.</div>${msgs.map((m,i)=>messageHTML(m,i?msgs[i-1]:null)).join('')}</div><div class="composer-wrap"><div class="composer"><button id="attachBtn" class="icon-btn image-attach-btn" title="Wyślij obraz lub PDF">＋</button><textarea id="messageInput" rows="1" placeholder="Napisz wiadomość na #${esc(currentChannel?.name||'kanale')}"></textarea><button id="emojiBtn" class="icon-btn" title="Wstaw kciuk w górę">👍</button><button id="sendBtn" class="btn primary" style="margin:0;padding:9px 14px">➤</button></div></div></div>`;
  const input=$('messageInput');
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,140)+'px'});
  input.addEventListener('paste',e=>{const files=[...(e.clipboardData?.items||[])].map(i=>i.getAsFile?.()).filter(Boolean);const supported=files.filter(f=>f.type.startsWith('image/')||f.type==='application/pdf');if(supported.length){e.preventDefault();sendAttachmentFiles(supported)}});
  input.addEventListener('dragover',e=>{e.preventDefault();input.classList.add('drop-ready')});
  input.addEventListener('dragleave',()=>input.classList.remove('drop-ready'));
  input.addEventListener('drop',e=>{e.preventDefault();input.classList.remove('drop-ready');const supported=[...(e.dataTransfer?.files||[])].filter(f=>f.type.startsWith('image/')||f.type==='application/pdf');if(supported.length)sendAttachmentFiles(supported)});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}});
  $('sendBtn').onclick=sendMessage;$('attachBtn').onclick=pickMessageFiles;$('emojiBtn').onclick=()=>{input.value+=(input.value?' ':'')+'👍';input.focus();input.dispatchEvent(new Event('input',{bubbles:true}))};
  $('chatScroll').scrollTop=$('chatScroll').scrollHeight;
  wireChatActions(); wireMentionPicker(input);
  applyComposerPermissionState();
}
function wireChatActions(){
  document.querySelectorAll('[data-profile]').forEach(x=>x.onclick=e=>{e.preventDefault();openProfile(x.dataset.profile,x)});
  document.querySelectorAll('[data-msg-action]').forEach(b=>b.onclick=()=>handleMessageAction(b.dataset.msgAction,b.dataset.id));
  document.querySelectorAll('[data-react]').forEach(b=>b.onclick=()=>toggleReaction(b.dataset.id,b.dataset.emoji));
  document.querySelectorAll('[data-addreact]').forEach(b=>b.onclick=()=>{const e=prompt('Emoji:','👍');if(e)toggleReaction(b.dataset.addreact,e)});
  document.querySelectorAll('[data-download-file]').forEach(b=>b.onclick=()=>downloadFirestoreFile({fileId:b.dataset.downloadFile,name:b.dataset.fileName||'plik.pdf',type:'application/pdf'}));
}
async function sendMessage(){
  if(!currentChannel)return;
  if(!(await effectivePermission('SEND_MESSAGES',currentChannel))){await applyComposerPermissionState();return toast('Nie masz uprawnienia do wysyłania wiadomości na tym kanale.','error')}
  const input=$('messageInput'),text=input.value.trim();if(!text)return;input.value='';
  try{await addDoc(collection(db,'messages'),{serverId:currentChannel.serverId,channelId:currentChannel.id,uid:me.uid,content:text,attachments:[],replyTo:null,reactions:{},pinned:false,createdAt:serverTimestamp()});}
  catch(e){toast('Nie udało się wysłać wiadomości: '+(e.message||e),'error')}
  await applyComposerPermissionState();
}
async function compressImageFile(file,maxChars=230000){
  if(!file?.type?.startsWith('image/')) throw new Error('Dozwolone są tylko obrazy.');
  const raw=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Nie udało się odczytać obrazu.'));r.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Nieprawidłowy obraz.'));im.src=raw});
  let scale=Math.min(1,1600/Math.max(img.width,img.height));
  let w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
  for(let attempt=0;attempt<10;attempt++){const c=document.createElement('canvas');c.width=w;c.height=h;const cx=c.getContext('2d');cx.drawImage(img,0,0,w,h);const q=Math.max(.38,.84-attempt*.055);let out;try{out=c.toDataURL('image/webp',q)}catch{out=c.toDataURL('image/jpeg',q)}if(out.length<=maxChars)return {url:out,name:file.name,type:'image/webp'};if(attempt%2===1){w=Math.max(480,Math.round(w*.82));h=Math.max(480,Math.round(h*.82));}}
  throw new Error('Obraz jest zbyt duży po kompresji.');
}
async function saveImageMessage(files){return sendAttachmentFiles((files||[]).filter(f=>f?.type?.startsWith('image/')).slice(0,3))}
function readFileAsDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('Nie udało się odczytać pliku.'));r.readAsDataURL(file)})}
async function savePdfToFirestore(file){
  if(!file||file.type!=='application/pdf')throw new Error('Dozwolone są tylko pliki PDF.');
  if(file.size>15*1024*1024)throw new Error('PDF może mieć maksymalnie 15 MB.');
  const dataUrl=await readFileAsDataUrl(file);const comma=dataUrl.indexOf(',');const base64=comma>=0?dataUrl.slice(comma+1):dataUrl;
  const fileId='file_'+uid().replaceAll('-','');const chunkSize=480000;const total=Math.ceil(base64.length/chunkSize);
  await setDoc(doc(db,'fileMeta',fileId),{fileId,ownerId:me.uid,name:file.name,size:file.size,type:'application/pdf',chunks:total,createdAt:serverTimestamp()});
  for(let i=0;i<total;i++)await setDoc(doc(db,'fileChunks',`${fileId}_${i}`),{fileId,chunkIndex:i,data:base64.slice(i*chunkSize,(i+1)*chunkSize)});
  return {kind:'firestore-file',fileId,name:file.name,size:file.size,type:'application/pdf',chunks:total};
}
async function sendAttachmentFiles(files){
  if(!currentChannel)return;
  if(!(await effectivePermission('ATTACH_FILES',currentChannel)) || !(await effectivePermission('SEND_MESSAGES',currentChannel))){await applyComposerPermissionState();return toast('Nie masz uprawnienia do wysyłania plików na tym kanale.','error')}const list=(files||[]).filter(Boolean).filter(f=>f.type?.startsWith('image/')||f.type==='application/pdf').slice(0,3);if(!list.length)return toast('Wybierz obraz albo PDF.','error');
  const attachments=[];for(const file of list){try{attachments.push(file.type==='application/pdf'?await savePdfToFirestore(file):await compressImageFile(file))}catch(e){toast(`${file.name}: ${e.message}`,'error')}}if(!attachments.length)return;
  try{await addDoc(collection(db,'messages'),{serverId:currentChannel.serverId,channelId:currentChannel.id,uid:me.uid,content:'',attachments,reactions:{},pinned:false,createdAt:serverTimestamp()});toast('Plik wysłany','success')}catch(e){toast('Nie udało się wysłać pliku: '+(e.message||e),'error')}}
async function downloadFirestoreFile(att){
  if(!att?.fileId)return;try{const snap=await getDocs(query(collection(db,'fileChunks'),where('fileId','==',att.fileId),limit(100)));const chunks=snap.docs.map(d=>d.data()).sort((a,b)=>Number(a.chunkIndex)-Number(b.chunkIndex));if(!chunks.length)throw new Error('Brak danych pliku.');const parts=[];let total=0;for(const c of chunks){const b=atob(c.data||'');const bytes=new Uint8Array(b.length);for(let i=0;i<b.length;i++)bytes[i]=b.charCodeAt(i);parts.push(bytes);total+=bytes.length}const out=new Uint8Array(total);let off=0;for(const part of parts){out.set(part,off);off+=part.length}const blob=new Blob([out],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=att.name||'plik.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}catch(e){toast('Nie udało się pobrać pliku: '+(e.message||e),'error')}}
async function pickMessageFiles(){const inp=document.createElement('input');inp.type='file';inp.multiple=true;inp.accept='image/*,application/pdf';inp.onchange=()=>sendAttachmentFiles([...(inp.files||[])]);inp.click()}
async function toggleReaction(mid,emoji){if(currentChannel && !(await effectivePermission('ADD_REACTIONS',currentChannel)))return toast('Nie masz uprawnienia do dodawania reakcji.','error');const s=await getDoc(doc(db,'messages',mid));if(!s.exists())return;const r=s.data().reactions||{},users=Array.isArray(r[emoji])?r[emoji]:[];const next=users.includes(me.uid)?users.filter(x=>x!==me.uid):[...users,me.uid];r[emoji]=next;await updateDoc(s.ref,{reactions:r});}
async function handleMessageAction(action,id){const s=await getDoc(doc(db,'messages',id));if(!s.exists())return;const m=s.data();if(action==='delete'){if(m.uid!==me.uid && !(await effectivePermission('MANAGE_MESSAGES',currentChannel)) && !isAdmin())return;await deleteDoc(s.ref);return}if(action==='edit'){if(m.uid!==me.uid)return;const text=prompt('Edytuj wiadomość:',m.content||'');if(text!==null)await updateDoc(s.ref,{content:text,editedAt:serverTimestamp()});return}if(action==='pin'){if(!(await effectivePermission('MANAGE_MESSAGES',currentChannel)))return toast('Nie masz uprawnienia do zarządzania wiadomościami.','error');await updateDoc(s.ref,{pinned:!m.pinned});return}if(action==='react'){const e=prompt('Emoji:','👍');if(e)await toggleReaction(id,e);return}if(action==='reply'){const text=prompt('Odpowiedź na wiadomość:',m.content||'');if(text===null)return;const input=$('messageInput');if(input){input.value='';await addDoc(collection(db,'messages'),{serverId:m.serverId,channelId:m.channelId,uid:me.uid,content:text,attachments:[],replyTo:id,replyPreview:(m.content||'').slice(0,120),reactions:{},pinned:false,createdAt:serverTimestamp()});}}}

async function getDMReadMs(otherId){
  try{return Number(localStorage.getItem(`privatecord.dmRead.${me.uid}.${otherId}`)||0)||0}catch{return 0}
}
function setDMReadMs(otherId,ms){
  if(!otherId||!ms)return;
  try{localStorage.setItem(`privatecord.dmRead.${me.uid}.${otherId}`,String(ms))}catch{}
  dmUnreadCounts.set(otherId,0);
  paintDMUnread();
}
function paintDMUnread(){
  let total=0;
  document.querySelectorAll('[data-dm]').forEach(btn=>{
    const id=btn.dataset.dm; const count=Number(dmUnreadCounts.get(id)||0); total+=count;
    let badge=btn.querySelector('.dm-unread-badge');
    if(!badge){badge=document.createElement('span');badge.className='dm-unread-badge';btn.appendChild(badge)}
    badge.textContent=count>99?'99+':String(count);
    badge.classList.toggle('hidden',count<=0);
    btn.classList.toggle('has-unread',count>0);
  });
  const totalEl=$('dmUnreadTotal');
  if(totalEl){totalEl.textContent=total>99?'99+':String(total);totalEl.classList.toggle('hidden',total<=0)}
  document.title=total>0?`(${total>99?'99+':total}) PrivateCord`:'PrivateCord';
}
function renderDMList(arr){
  const el=$('dmList'); if(!el)return;
  el.innerHTML=arr.map(x=>{
    const count=Number(dmUnreadCounts.get(x.user.uid)||0);
    return `<button class="dm-item ${count?'has-unread':''}" data-dm="${esc(x.user.uid)}">${avatarHTML(x.user,'sm')}<span class="name">${esc(x.user.displayName||x.user.username)}</span><span class="dm-unread-badge ${count?'':'hidden'}">${count>99?'99+':count}</span></button>`;
  }).join('')||'<div class="empty-state" style="padding:10px">Brak rozmów.</div>';
  el.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>openDM(b.dataset.dm));
  paintDMUnread();
}
async function subscribeDMList(){
  dmsUnsub?.(); if(!me)return;
  const q=query(collection(db,'dms'),where('participants','array-contains',me.uid),limit(500));
  dmsUnsub=onSnapshot(q,async snap=>{
    const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
    const byUser=new Map();
    for(const x of rows){
      const other=(x.participants||[]).find(id=>id!==me.uid); if(!other)continue;
      const row=byUser.get(other);
      if(!row||tsMs(x.createdAt)>tsMs(row.last.createdAt))byUser.set(other,{user:await getUser(other),last:x});
    }
    const arr=[...byUser.values()].sort((a,b)=>tsMs(b.last.createdAt)-tsMs(a.last.createdAt));
    for(const x of arr){
      const other=x.user.uid; const seen=await getDMReadMs(other);
      const unread=rows.filter(m=>(m.participants||[]).includes(other)&&m.to===me.uid&&tsMs(m.createdAt)>seen);
      dmUnreadCounts.set(other,unread.length);
      const latestIncoming=unread.reduce((best,m)=>!best||tsMs(m.createdAt)>tsMs(best.createdAt)?m:best,null);
      const latestKey=latestIncoming?.id||''; const previous=dmLiveLatest.get(other);
      if(latestIncoming&&previous&&previous!==latestKey&&!(currentDMUser?.uid===other&&document.visibilityState==='visible'))toast(`Nowa wiadomość od ${x.user.displayName||x.user.username}`,'success');
      if(latestKey)dmLiveLatest.set(other,latestKey);
      if(currentDMUser?.uid===other&&document.visibilityState==='visible'&&tsMs(x.last.createdAt))setDMReadMs(other,tsMs(x.last.createdAt));
    }
    renderDMList(arr);
  },e=>{console.error('DM list',e);toast('Nie udało się wczytać wiadomości bezpośrednich: '+(e.message||e),'error')});
}
async function openDM(uid2){
  $('membersPane').classList.add('hidden');
  const u=await getUser(uid2); currentDMUser=u; currentServer=null; currentChannel=null; currentPage='dm';
  $('homeSidebar').classList.remove('hidden'); $('serverSidebar').classList.add('hidden'); renderTop();
  dmConversationUnsub?.();
  const q=query(collection(db,'dms'),where('participants','array-contains',me.uid),limit(500));
  dmConversationUnsub=onSnapshot(q,snap=>{
    const arr=snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>(m.participants||[]).includes(uid2));
    arr.sort((a,b)=>tsMs(a.createdAt)-tsMs(b.createdAt)); renderDM(arr);
    const last=arr.at(-1); if(last?.createdAt)setDMReadMs(uid2,tsMs(last.createdAt));
  },e=>toast('Nie udało się wczytać rozmowy: '+(e.message||e),'error'));
}
function renderDM(msgs){
  $('mainContent').innerHTML=`<div class="chat"><div id="chatScroll" class="chat-scroll">${msgs.map(m=>{const u=m.from===me.uid?me:currentDMUser;return `<div class="message-row">${avatarHTML(u,'sm')}<div class="message-body"><div class="message-meta"><button class="message-author" data-profile="${esc(u.uid)}">${esc(u.displayName||u.username)}</button><time>${dateText(m.createdAt)}</time></div><div class="message-text">${formatText(m.content||'')}</div>${attachmentsHTML(m.attachments)}</div></div>`}).join('')||'<div class="chat-header-empty">To początek tej rozmowy.</div>'}</div><div class="composer-wrap"><div class="composer"><button id="dmAttach" class="icon-btn image-attach-btn" title="Wyślij obraz lub PDF">＋</button><textarea id="dmInput" rows="1" placeholder="Napisz wiadomość…"></textarea><button id="dmEmoji" class="icon-btn" title="Wstaw kciuk w górę">👍</button><button id="dmSend" class="btn primary" style="margin:0;padding:9px 14px">➤</button></div></div></div>`;
  $('dmSend').onclick=sendDM;
  $('dmInput').addEventListener('input',()=>{$('dmInput').style.height='auto';$('dmInput').style.height=Math.min($('dmInput').scrollHeight,140)+'px'});
  $('dmInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendDM()}});
  $('dmAttach').onclick=pickDMFiles;
  $('dmEmoji').onclick=()=>{const i=$('dmInput');i.value+=(i.value?' ':'')+'👍';i.focus()};
  wireChatActions(); $('chatScroll').scrollTop=$('chatScroll').scrollHeight; paintDMUnread();
}
async function sendDM(){
  const input=$('dmInput'); const text=input?.value?.trim()||''; if(!text||!currentDMUser)return;
  input.value='';
  try{await addDoc(collection(db,'dms'),{participants:[me.uid,currentDMUser.uid],from:me.uid,to:currentDMUser.uid,content:text,attachments:[],createdAt:serverTimestamp()});setDMReadMs(currentDMUser.uid,Date.now())}
  catch(e){input.value=text;toast('Nie udało się wysłać wiadomości: '+(e.message||e),'error')}
}
async function pickDMFiles(){
  const inp=document.createElement('input');inp.type='file';inp.multiple=true;inp.accept='image/*,application/pdf';
  inp.onchange=async()=>{if(!currentDMUser)return;const attachments=[];for(const file of [...inp.files].slice(0,3)){try{attachments.push(file.type==='application/pdf'?await savePdfToFirestore(file):await compressImageFile(file))}catch(e){toast(`${file.name}: ${e.message}`,'error')}}if(!attachments.length)return;try{await addDoc(collection(db,'dms'),{participants:[me.uid,currentDMUser.uid],from:me.uid,to:currentDMUser.uid,content:'',attachments,createdAt:serverTimestamp()});setDMReadMs(currentDMUser.uid,Date.now());toast('Plik wysłany','success')}catch(e){toast('Nie udało się wysłać pliku: '+(e.message||e),'error')}};inp.click()
}

function setPageNav(active){document.querySelectorAll('.nav-row').forEach(b=>b.classList.toggle('active',b.dataset.page===active));}
async function renderHome(){stopPresenceRefresh();$('membersPane').classList.add('hidden');currentPage='home';currentServer=null;currentChannel=null;currentDMUser=null;$('homeSidebar').classList.remove('hidden');$('serverSidebar').classList.add('hidden');setPageNav('home');$('mainContent').innerHTML=`<div class="home-page"><div class="hero-card"><div class="hero-eyebrow">PRIVATECORD</div><h1>Wszystko w jednym miejscu.</h1><p>Rozmawiaj ze znajomymi, zarządzaj serwerami i twórz własne społeczności.</p><div class="quick-grid"><button class="quick-card" id="homeFriend"><b>Dodaj znajomego</b><span>Wyszukaj osobę po nazwie lub tagu.</span></button><button class="quick-card" id="homeServer"><b>Utwórz serwer</b><span>Stwórz serwer, kategorie, kanały i role.</span></button><button class="quick-card" id="homeSearch"><b>Wyszukaj</b><span>Osoby, serwery i wiadomości.</span></button><button class="quick-card" id="homeBot"><b>Boty</b><span>Stwórz własnego bota i pobierz starter Pythona.</span></button></div></div></div>`;$('homeFriend').onclick=friendAddModal;$('homeServer').onclick=createServerModal;$('homeSearch').onclick=globalSearchModal;$('homeBot').onclick=showBots;renderTop()}
async function showFriends(filter='all'){stopPresenceRefresh();$('membersPane').classList.add('hidden');currentPage='friends';currentServer=null;currentChannel=null;currentDMUser=null;$('homeSidebar').classList.remove('hidden');$('serverSidebar').classList.add('hidden');setPageNav('friends');const fUsers=await Promise.all((me.friends||[]).map(getUser));const incomingSnap=await getDocs(query(collection(db,'friendRequests'),where('toId','==',me.uid),limit(100)));const incoming=incomingSnap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status==='pending');const blocked=await Promise.all((me.blocked||[]).map(getUser));const serverInvSnap=await getDocs(query(collection(db,'serverInvites'),where('toId','==',me.uid),limit(100)));const serverInv=serverInvSnap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status==='pending');$('mainContent').innerHTML=`<div class="friends-page"><div class="friends-layout"><aside class="friends-nav"><button class="active" data-filter="all">Wszyscy <span>${fUsers.length}</span></button><button data-filter="incoming">Zaproszenia <span class="nav-count">${incoming.length}</span></button><button data-filter="serverInvites">Serwery <span>${serverInv.length}</span></button><button data-filter="blocked">Zablokowani <span>${blocked.length}</span></button></aside><section class="friends-main"><div class="friend-toolbar"><button id="friendsAdd" class="pill primary">Dodaj znajomego</button><button id="friendsSearch" class="pill">Znajdź osoby</button><button id="friendsServers" class="pill">Znajdź serwery</button></div><div id="friendList" class="friend-list"></div></section></div></div>`;$('friendsAdd').onclick=friendAddModal;$('friendsSearch').onclick=globalSearchModal;$('friendsServers').onclick=showDiscover;const render=async type=>{let html='';if(type==='all'){html=fUsers.map(u=>friendRow(u)).join('')||'<div class="empty-state">Nie masz jeszcze znajomych.</div>'}else if(type==='incoming'){html=(await Promise.all(incoming.map(async r=>{const u=await getUser(r.fromId);return `<div class="friend-row">${avatarHTML(u,'sm')}<div class="member-copy"><b>${esc(u.displayName||u.username)}</b><small>${esc(tagOf(u))}</small></div><div class="friend-actions"><button class="pill primary" data-accept="${r.id}">Akceptuj</button><button class="pill" data-reject="${r.id}">Odrzuć</button></div></div>`}))).join('')||'<div class="empty-state">Brak zaproszeń od znajomych.</div>'}else if(type==='serverInvites'){html=(await Promise.all(serverInv.map(async r=>{const sv=await getDoc(doc(db,'servers',r.serverId));const d=sv.exists()?sv.data():{name:'Nieznany serwer'};const from=await getUser(r.fromId);return `<div class="friend-row"><div class="server-card-icon" style="width:40px;height:40px">${d.icon?`<img src="${esc(d.icon)}" style="width:100%;height:100%;border-radius:10px">`:'K'}</div><div class="member-copy"><b>${esc(d.name)}</b><small>Zaproszenie od ${esc(from.displayName||from.username)}</small></div><div class="friend-actions"><button class="pill primary" data-accept-server="${r.id}">Akceptuj</button><button class="pill" data-reject-server="${r.id}">Odrzuć</button></div></div>`}))).join('')||'<div class="empty-state">Brak zaproszeń do serwerów.</div>'}else{html=blocked.map(u=>`<div class="friend-row">${avatarHTML(u,'sm')}<div class="member-copy"><b>${esc(u.displayName||u.username)}</b><small>${esc(tagOf(u))}</small></div><div class="friend-actions"><button class="pill" data-unblock="${u.uid}">Odblokuj</button></div></div>`).join('')||'<div class="empty-state">Brak zablokowanych.</div>'}$('friendList').innerHTML=html;wireFriendActions(type)};document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.filter)});await render(filter);renderTop()}
async function subscribeFriendRequests(){friendUnsub?.();if(!me)return;const q=query(collection(db,'friendRequests'),where('toId','==',me.uid),limit(100));friendUnsub=onSnapshot(q,snap=>{const count=snap.docs.filter(d=>d.data()?.status==='pending').length;const el=$('friendCount');if(el){el.textContent=String(count);el.classList.toggle('hidden',count===0)}},e=>{console.warn('friend requests',e);$('friendCount')?.classList.add('hidden')})}
function friendRow(u){return `<div class="friend-row"><button class="friend-main" data-profile="${u.uid}">${avatarHTML(u,'sm')}<span class="member-copy"><b>${esc(u.displayName||u.username)}</b><small>${esc(tagOf(u))} • ${esc(statuses[statusOf(u)].label)}</small></span></button><div class="friend-actions"><button class="pill" data-dm="${u.uid}">Wiadomość</button><button class="pill" data-remove="${u.uid}">Usuń</button></div></div>`}
function wireFriendActions(){document.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>openProfile(b.dataset.profile,b));document.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>openDM(b.dataset.dm));document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeFriend(b.dataset.remove));document.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>acceptFriend(b.dataset.accept));document.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>rejectFriend(b.dataset.reject));document.querySelectorAll('[data-unblock]').forEach(b=>b.onclick=()=>unblockUser(b.dataset.unblock));document.querySelectorAll('[data-accept-server]').forEach(b=>b.onclick=()=>acceptServerInvite(b.dataset.acceptServer));document.querySelectorAll('[data-reject-server]').forEach(b=>b.onclick=()=>rejectServerInvite(b.dataset.rejectServer))}
async function friendAddModal(){openModal(`<div class="modal-head"><h2>Dodaj znajomego</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><p class="muted">Wpisz pełną nazwę wraz z tagiem, np. <b>LOP#4521</b>.</p><input id="friendQuery" placeholder="Nazwa#1234" autocomplete="off"><div id="friendResults" class="search-results"></div></div>`,()=>{$('modalClose').onclick=closeModal;$('friendQuery').oninput=()=>searchPeople($('friendQuery').value);setTimeout(()=>$('friendQuery').focus(),20)})}
async function searchPeople(term){const out=$('friendResults');if(!out)return;term=term.trim();const m=/^(.+?)#(\d{4})$/u.exec(term);if(!m){out.innerHTML=term.length?'<div class="search-hint">Wpisz pełną nazwę i 4-cyfrowy tag, np. <b>LOP#4521</b>.</div>':'';return}const username=m[1].trim(),disc=m[2];const snap=await getDocs(query(collection(db,'users'),where('username','==',username),limit(20))).catch(()=>null);if(!snap){out.innerHTML='<div class="muted">Wyszukiwanie nie powiodło się.</div>';return}const rows=snap.docs.map(d=>({uid:d.id,...d.data()})).filter(u=>u.uid!==me.uid&&String(u.discriminator||'').padStart(4,'0')===disc);out.innerHTML=rows.map(u=>`<div class="search-item">${avatarHTML(u,'sm')}<div class="member-copy"><b>${esc(u.displayName||u.username)}</b><small>${esc(tagOf(u))}</small></div><button class="pill primary" data-add-friend="${u.uid}">Dodaj</button></div>`).join('')||'<div class="muted">Nie znaleziono dokładnie tej osoby.</div>';out.querySelectorAll('[data-add-friend]').forEach(b=>b.onclick=async()=>{await sendFriendRequest(b.dataset.addFriend);b.textContent='Wysłano';b.disabled=true})}
async function sendFriendRequest(to){if(to===me.uid)return toast('Nie możesz dodać siebie','error');if((me.blocked||[]).includes(to))return toast('Najpierw odblokuj tę osobę','error');try{await setDoc(doc(db,'friendRequests',`${me.uid}_${to}`),{fromId:me.uid,toId:to,status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});toast('Zaproszenie wysłane','success')}catch(e){console.error('sendFriendRequest',e);toast('Nie udało się wysłać zaproszenia: '+(e.message||e),'error')}}
async function acceptFriend(id){try{const s=await getDoc(doc(db,'friendRequests',id));if(!s.exists())return;const d=s.data();if(d.toId!==me.uid||d.status!=='pending')return;await updateDoc(s.ref,{status:'accepted',updatedAt:serverTimestamp()});await updateDoc(doc(db,'users',me.uid),{friends:arrayUnion(d.fromId)});await updateDoc(doc(db,'users',d.fromId),{friends:arrayUnion(me.uid)});await refreshMe();toast('Zaproszenie zaakceptowane','success');showFriends('all')}catch(e){toast('Nie udało się zaakceptować: '+(e.message||e),'error')}}
async function rejectFriend(id){try{const s=await getDoc(doc(db,'friendRequests',id));if(s.exists()&&s.data().toId===me.uid)await updateDoc(s.ref,{status:'rejected',updatedAt:serverTimestamp()});showFriends('incoming')}catch(e){toast('Nie udało się odrzucić zaproszenia: '+(e.message||e),'error')}}
async function removeFriend(id){await updateDoc(doc(db,'users',me.uid),{friends:arrayRemove(id)});await updateDoc(doc(db,'users',id),{friends:arrayRemove(me.uid)}).catch(()=>{});await refreshMe();showFriends()}
async function blockUser(id){await updateDoc(doc(db,'users',me.uid),{blocked:arrayUnion(id),friends:arrayRemove(id)});await updateDoc(doc(db,'users',id),{friends:arrayRemove(me.uid)}).catch(()=>{});await setDoc(doc(collection(db,'blocks')),{blockerId:me.uid,blockedId:id,createdAt:serverTimestamp()});await refreshMe();closeProfile();toast('Użytkownik zablokowany')}
async function unblockUser(id){await updateDoc(doc(db,'users',me.uid),{blocked:arrayRemove(id)});const s=await getDocs(query(collection(db,'blocks'),where('blockerId','==',me.uid),where('blockedId','==',id),limit(10)));for(const d of s.docs)await deleteDoc(d.ref);await refreshMe();showFriends('blocked')}

async function acceptServerInvite(id){const s=await getDoc(doc(db,'serverInvites',id));if(!s.exists())return;const d=s.data();if(d.toId!==me.uid)return;await updateDoc(s.ref,{status:'accepted',acceptedAt:serverTimestamp()});await joinServer(d.serverId);toast('Dołączono przez zaproszenie','success');showFriends('serverInvites')}
async function rejectServerInvite(id){const s=await getDoc(doc(db,'serverInvites',id));if(s.exists()&&s.data().toId===me.uid){await updateDoc(s.ref,{status:'rejected',updatedAt:serverTimestamp()});toast('Zaproszenie odrzucone');showFriends('serverInvites')}}

async function showDiscover(){stopPresenceRefresh();$('membersPane').classList.add('hidden');currentPage='discover';currentServer=null;currentChannel=null;currentDMUser=null;$('homeSidebar').classList.remove('hidden');$('serverSidebar').classList.add('hidden');setPageNav('discover');$('mainContent').innerHTML=`<div class="discover-page"><div class="page-head"><div><h1>Odkrywaj</h1><p class="muted">Znajdź publiczne serwery tekstowe.</p></div><button id="joinCode" class="pill">Dołącz przez kod zaproszenia</button></div><div class="search-bar-large"><input id="discoverQ" placeholder="Szukaj serwerów…"></div><div id="serverResults" class="discover-grid"></div></div>`;$('discoverQ').oninput=()=>searchServers($('discoverQ').value);$('joinCode').onclick=joinByCodeModal;await searchServers('');renderTop()}
async function searchServers(term){const out=$('serverResults');if(!out)return;const q=query(collection(db,'servers'),limit(100));const s=await getDocs(q).catch(()=>null);if(!s){out.innerHTML='';return}let arr=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.public!==false);if(term.trim())arr=arr.filter(x=>String(x.name||'').toLowerCase().includes(term.trim().toLowerCase()));out.innerHTML=arr.map(x=>`<div class="server-card">${x.banner?`<div class="discover-banner" style="background-image:url('${esc(x.banner)}')"></div>`:'<div class="discover-banner"></div>'}<div class="server-card-body">${x.icon?`<img src="${esc(x.icon)}" class="server-card-icon">`:''}<div class="server-card-copy"><b>${esc(x.name)}</b><span>${esc(x.description||'Brak opisu')}</span><small>${(x.members||[]).length} członków</small></div><button class="pill primary" data-join="${x.id}">Dołącz</button></div></div>`).join('')||'<div class="empty-state">Brak serwerów.</div>';out.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>joinServer(b.dataset.join))}
async function joinServer(id){
  try{
    const s=await getDoc(doc(db,'servers',id));
    if(!s.exists())return toast('Serwer nie istnieje.','error');
    const d=s.data();
    if((me.blockedServers||[]).includes(id))return toast('Ten serwer jest zablokowany.','error');
    if((d.members||[]).includes(me.uid)){toast('Już jesteś na tym serwerze');await openServer(id);return;}
    const ban=await getDoc(doc(db,'bans',`${id}_${me.uid}`));
    if(ban.exists())return toast('Masz bana na tym serwerze.','error');
    if(d.requireApproval){
      await setDoc(doc(db,'serverJoinRequests',`${id}_${me.uid}`),{serverId:id,userId:me.uid,status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
      return toast('Wysłano prośbę o dołączenie','success');
    }
    await updateDoc(s.ref,{members:arrayUnion(me.uid)});
    await setDoc(doc(db,'serverMembers',`${id}_${me.uid}`),{serverId:id,userId:me.uid,roleIds:[],nickname:'',timeoutUntil:null,joinedAt:serverTimestamp()},{merge:true});
    toast('Dołączono do serwera','success');
    await openServer(id);
  }catch(e){console.error('joinServer',e);toast('Nie udało się dołączyć do serwera: '+(e.message||e),'error')}
}
async function joinByCodeModal(){openModal(`<div class="modal-head"><h2>Dołącz przez kod</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><input id="inviteCodeInput" placeholder="Wklej kod zaproszenia"><button id="inviteJoin" class="btn primary">Dołącz</button></div>`,()=>{$('modalClose').onclick=closeModal;$('inviteJoin').onclick=async()=>{const code=$('inviteCodeInput').value.trim();if(!code)return;const q=query(collection(db,'serverInvites'),where('code','==',code),where('status','==','active'),limit(1));const s=await getDocs(q);if(s.empty)return toast('Nieprawidłowy lub wygasły kod','error');const inv={id:s.docs[0].id,...s.docs[0].data()};await joinServer(inv.serverId);closeModal()}})}

function createServerModal(){openModal(`<div class="modal-head"><h2>Utwórz serwer</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><label>Nazwa<input id="newServerName" placeholder="Moja społeczność"></label><label>Opis<textarea id="newServerDesc" rows="3" placeholder="Krótki opis serwera"></textarea></label><label>Ikona URL<input id="newServerIcon" placeholder="https://…"></label><label>Banner URL<input id="newServerBanner" placeholder="https://…"></label><label class="check-line"><input id="newServerPublic" type="checkbox" checked> Serwer publiczny</label></div><div class="modal-foot"><button id="modalCancel" class="pill">Anuluj</button><button id="createServer" class="btn primary" style="margin:0">Utwórz</button></div>`,()=>{$('modalClose').onclick=closeModal;$('modalCancel').onclick=closeModal;$('createServer').onclick=async()=>{const name=$('newServerName').value.trim();if(!name)return toast('Podaj nazwę','error');const mine=await getDocs(query(collection(db,'servers'),where('ownerId','==',me.uid),limit(20)));if(mine.size>=10)return toast('Osiągnięto limit 10 własnych serwerów.','error');const refDoc=await addDoc(collection(db,'servers'),{name,description:$('newServerDesc').value.trim(),icon:$('newServerIcon').value.trim(),banner:$('newServerBanner').value.trim(),ownerId:me.uid,members:[me.uid],public:$('newServerPublic').checked,requireApproval:false,createdAt:serverTimestamp()});await setDoc(doc(db,'serverMembers',`${refDoc.id}_${me.uid}`),{serverId:refDoc.id,userId:me.uid,roleIds:[],nickname:'',timeoutUntil:null,joinedAt:serverTimestamp()});const role=await addDoc(collection(db,'serverRoles'),{serverId:refDoc.id,name:'@everyone',color:'#99aab5',position:0,permissions:['VIEW_CHANNEL','READ_HISTORY','SEND_MESSAGES'],hoist:false,mentionable:false,isEveryone:true,createdAt:serverTimestamp()});const cat=await addDoc(collection(db,'categories'),{serverId:refDoc.id,name:'INFORMACJE',position:0,permissionOverwrites:{}});await addDoc(collection(db,'channels'),{serverId:refDoc.id,categoryId:cat.id,name:'ogólny',position:0,topic:'Witaj w PrivateCord.',permissionOverwrites:{},syncWithCategory:true,permissionDenyRoles:{SEND_MESSAGES:[]},permissionAllowRoles:{SEND_MESSAGES:[]},permissionDenyEveryone:{SEND_MESSAGES:false},permissionAllowEveryone:{SEND_MESSAGES:false},createdAt:serverTimestamp()});closeModal();renderServers();await new Promise(r=>setTimeout(r,150));await openServer(refDoc.id);toast('Serwer utworzony','success')}})}

function serverContextItems(id){return [{label:'Otwórz serwer',fn:()=>openServer(id)},{label:'Utwórz kategorię',fn:()=>categoryModal()},{label:'Utwórz kanał',fn:()=>channelModal({categoryId:null})},{sep:true},{label:'Zaproś osoby',fn:()=>serverInviteModal(id)},{label:'Ustawienia serwera',fn:()=>serverSettingsModal(id)},{label:'Kopiuj ID',fn:()=>navigator.clipboard?.writeText(id)},{sep:true},{label:'Opuść serwer',danger:true,fn:()=>leaveServer(id)}]}
function categoryContextItems(id){return [{label:'Utwórz kanał',fn:()=>channelModal({categoryId:id})},{label:'Edytuj kategorię',fn:()=>categoryModal(id)},{label:'Uprawnienia kategorii',fn:()=>permissionModal({type:'category',id})},{sep:true},{label:'Przenieś wyżej',fn:()=>moveCategory(id,-1)},{label:'Przenieś niżej',fn:()=>moveCategory(id,1)},{label:'Usuń kategorię',danger:true,fn:()=>deleteCategory(id)}]}
function channelContextItems(id){return [{label:'Otwórz kanał',fn:()=>openChannel(id)},{label:'Edytuj kanał',fn:()=>channelModal({id})},{label:'Uprawnienia kanału',fn:()=>permissionModal({type:'channel',id})},{label:'Duplikuj kanał',fn:()=>duplicateChannel(id)},{sep:true},{label:'Przenieś wyżej',fn:()=>moveChannel(id,-1)},{label:'Przenieś niżej',fn:()=>moveChannel(id,1)},{sep:true},{label:'Usuń kanał',danger:true,fn:()=>deleteChannel(id)}]}
function showContext(x,y,items){const c=$('contextMenu');c.innerHTML=items.map(it=>it.sep?'<div class="sep"></div>':`<button class="${it.danger?'danger':''}" data-action="ctx">${esc(it.label)}</button>`).join('');c.style.left=Math.min(x,window.innerWidth-250)+'px';c.style.top=Math.min(y,window.innerHeight-320)+'px';c.classList.remove('hidden');let i=0;c.querySelectorAll('[data-action="ctx"]').forEach(b=>{const item=items.filter(x=>!x.sep)[i++];b.onclick=()=>{c.classList.add('hidden');item.fn?.()}})}
document.addEventListener('click',e=>{if(!e.target.closest('#contextMenu'))$('contextMenu').classList.add('hidden')});
async function categoryModal(id){if(!(await hasServerPermission('MANAGE_CHANNELS')))return toast('Nie masz uprawnienia do zarządzania kanałami.','error');const existing=id?await getDoc(doc(db,'categories',id)):null;const d=existing?.data()||{};openModal(`<div class="modal-head"><h2>${id?'Edytuj kategorię':'Utwórz kategorię'}</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><label>Nazwa<input id="catName" value="${esc(d.name||'NOWA KATEGORIA')}"></label></div><div class="modal-foot"><button id="modalCancel" class="pill">Anuluj</button><button id="catSave" class="btn primary" style="margin:0">Zapisz</button></div>`,()=>{$('modalClose').onclick=closeModal;$('modalCancel').onclick=closeModal;$('catSave').onclick=async()=>{const name=$('catName').value.trim();if(!name)return; if(id)await updateDoc(existing.ref,{name});else{const s=await getDocs(query(collection(db,'categories'),where('serverId','==',currentServer.id),limit(100)));await addDoc(collection(db,'categories'),{serverId:currentServer.id,name,position:s.size||0,permissionOverwrites:{}})}closeModal();loadServerTree();toast('Kategoria zapisana','success')}})}
async function channelModal(arg={}){if(!(await hasServerPermission('MANAGE_CHANNELS')))return toast('Nie masz uprawnienia do zarządzania kanałami.','error');const id=arg.id;const existing=id?await getDoc(doc(db,'channels',id)):null;const d=existing?.data()||{};const cats=await getDocs(query(collection(db,'categories'),where('serverId','==',currentServer.id),limit(100)));const options=cats.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>(a.position??0)-(b.position??0));openModal(`<div class="modal-head"><h2>${id?'Edytuj kanał':'Utwórz kanał'}</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><label>Nazwa<input id="chName" value="${esc(d.name||'nowy-kanal')}"></label><label>Temat<textarea id="chTopic" rows="3">${esc(d.topic||'')}</textarea></label><label>Kategoria<select id="chCategory"><option value="">Bez kategorii</option>${options.map(c=>`<option value="${c.id}" ${d.categoryId===c.id||arg.categoryId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="check-line"><input type="checkbox" id="chSync" ${(d.syncWithCategory??true)?'checked':''}> Synchronizuj uprawnienia z kategorią</label></div><div class="modal-foot"><button id="modalCancel" class="pill">Anuluj</button><button id="chSave" class="btn primary" style="margin:0">Zapisz</button></div>`,()=>{$('modalClose').onclick=closeModal;$('modalCancel').onclick=closeModal;$('chSave').onclick=async()=>{const data={name:$('chName').value.trim(),topic:$('chTopic').value.trim(),categoryId:$('chCategory').value||null,syncWithCategory:$('chSync').checked};if(!data.name)return; if(id)await updateDoc(existing.ref,data);else{const s=await getDocs(query(collection(db,'channels'),where('serverId','==',currentServer.id),limit(200)));await addDoc(collection(db,'channels'),{...data,serverId:currentServer.id,position:s.size||0,permissionOverwrites:{},permissionDenyRoles:{SEND_MESSAGES:[]},permissionAllowRoles:{SEND_MESSAGES:[]},permissionDenyEveryone:{SEND_MESSAGES:false},permissionAllowEveryone:{SEND_MESSAGES:false},createdAt:serverTimestamp()})}closeModal();loadServerTree();toast('Kanał zapisany','success')}})}
async function deleteCategory(id){if(!(await hasServerPermission('MANAGE_CHANNELS')))return toast('Nie masz uprawnienia do zarządzania kanałami.','error');if(!confirm('Usunąć kategorię? Kanały pozostaną bez kategorii.'))return;const ch=await getDocs(query(collection(db,'channels'),where('serverId','==',currentServer.id),limit(200)));for(const d of ch.docs)if(d.data().categoryId===id)await updateDoc(d.ref,{categoryId:null});await deleteDoc(doc(db,'categories',id));loadServerTree()}
async function deleteChannel(id){if(!(await hasServerPermission('MANAGE_CHANNELS')))return toast('Nie masz uprawnienia do zarządzania kanałami.','error');if(!confirm('Usunąć kanał?'))return;await deleteDoc(doc(db,'channels',id));if(currentChannel?.id===id){currentChannel=null;renderServerWelcome()}loadServerTree()}
async function duplicateChannel(id){if(!(await hasServerPermission('MANAGE_CHANNELS')))return toast('Nie masz uprawnienia do zarządzania kanałami.','error');const s=await getDoc(doc(db,'channels',id));if(!s.exists())return;const d=s.data();await addDoc(collection(db,'channels'),{...d,name:`${d.name}-kopia`,position:(d.position??0)+1,createdAt:serverTimestamp()});loadServerTree()}
async function moveCategory(id,delta){if(!(await hasServerPermission('MANAGE_CHANNELS')))return toast('Nie masz uprawnienia do zarządzania kanałami.','error');const s=await getDocs(query(collection(db,'categories'),where('serverId','==',currentServer.id),limit(100)));const arr=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.position??0)-(b.position??0));const i=arr.findIndex(x=>x.id===id),j=i+delta;if(i<0||j<0||j>=arr.length)return;await reorderCategory(arr[i].id,arr[j].id)}
async function moveChannel(id,delta){if(!(await hasServerPermission('MANAGE_CHANNELS')))return toast('Nie masz uprawnienia do zarządzania kanałami.','error');

  const target=await getDoc(doc(db,'channels',id)); if(!target.exists())return;
  const catId=target.data().categoryId??null;
  const s=await getDocs(query(collection(db,'channels'),where('serverId','==',currentServer.id),limit(500)));
  const arr=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>(x.categoryId??null)===catId).sort((a,b)=>(a.position??0)-(b.position??0));
  const i=arr.findIndex(x=>x.id===id),j=i+delta; if(i<0||j<0||j>=arr.length)return; await reorderChannel(arr[i].id,arr[j].id);
}
async function leaveServer(id){if(!confirm('Opuścić serwer?'))return;const s=await getDoc(doc(db,'servers',id));if(!s.exists())return;await updateDoc(s.ref,{members:arrayRemove(me.uid)});await deleteDoc(doc(db,'serverMembers',`${id}_${me.uid}`)).catch(()=>{});if(currentServer?.id===id){currentServer=null;currentChannel=null;renderHome()}}


function buildSendPermissionMeta(state,roles){
  const denySendRoles=[],allowSendRoles=[];
  let denySendEveryone=false,allowSendEveryone=false;
  for(const r of roles){
    const v=Number(state?.[r.id]?.SEND_MESSAGES||0);
    if(v===-1){if(r.isEveryone)denySendEveryone=true;else denySendRoles.push(r.id)}
    if(v===1){if(r.isEveryone)allowSendEveryone=true;else allowSendRoles.push(r.id)}
  }
  return {permissionDenyRoles:{SEND_MESSAGES:denySendRoles},permissionAllowRoles:{SEND_MESSAGES:allowSendRoles},permissionDenyEveryone:{SEND_MESSAGES:denySendEveryone},permissionAllowEveryone:{SEND_MESSAGES:allowSendEveryone}};
}

async function permissionModal({type,id}){if(!(await hasServerPermission('MANAGE_CHANNELS')))return toast('Nie masz uprawnienia do edycji uprawnień kanałów.','error');
  const parent=type==='category'?await getDoc(doc(db,'categories',id)):await getDoc(doc(db,'channels',id));if(!parent.exists())return;const d=parent.data();const rolesSnap=await getDocs(query(collection(db,'serverRoles'),where('serverId','==',currentServer.id),limit(100)));const roles=rolesSnap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>(b.position??0)-(a.position??0));roles.forEach(r=>cacheRoles.set(r.id,r));let selected=roles[0]?.id;let state={...(d.permissionOverwrites||{})};
  const render=()=>`<div class="perm-picker">${roles.map(r=>`<button class="perm-role ${r.id===selected?'active':''}" data-role="${r.id}"><span class="role-color" style="background:${esc(r.color||'#99aab5')}"></span>${esc(r.name)}</button>`).join('')}</div>`;
  openModal(`<div class="modal-head"><div><h2>Uprawnienia ${type==='category'?'kategorii':'kanału'}</h2><small class="muted">${esc(d.name||'')}</small></div><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><div class="perm-toolbar"><button id="syncNow" class="pill">${type==='channel'?'Synchronizuj z kategorią':'Zastosuj do kanałów'}</button><span class="muted">Każde uprawnienie: dziedzicz / zezwól / zabroń.</span></div><div class="perm-layout"><div id="permRoles">${render()}</div><div id="permList"></div></div></div><div class="modal-foot"><button id="modalCancel" class="pill">Anuluj</button><button id="permSave" class="btn primary" style="margin:0">Zapisz zmiany</button></div>`,()=>{
    $('modalClose').onclick=closeModal;$('modalCancel').onclick=closeModal;
    const draw=()=>{ $('permRoles').innerHTML=render();$('permRoles').querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{selected=b.dataset.role;draw()});const roleState=state[selected]||{};$('permList').innerHTML=`<div class="perm-table"><div class="perm-grid"><div class="perm-row perm-head"><div>Uprawnienie</div><div>Dziedzicz</div><div>Zezwól</div><div>Zabroń</div></div>${Object.entries(permissionGroups).map(([g,items])=>`<div class="perm-section-title">${g}</div>${items.map(p=>{const v=roleState[p]??0;return `<div class="perm-row"><div class="perm-name"><b>${esc(permissionMeta[p][0])}</b><small>${esc(permissionMeta[p][1])}</small></div><div class="perm-btn"><button class="${v===0?'inherit':''}" data-setperm="${p}" data-v="0">—</button></div><div class="perm-btn"><button class="${v===1?'allow':''}" data-setperm="${p}" data-v="1">✓</button></div><div class="perm-btn"><button class="${v===-1?'deny':''}" data-setperm="${p}" data-v="-1">×</button></div></div>`}).join('')}`).join('')}</div></div>`;$('permList').querySelectorAll('[data-setperm]').forEach(b=>b.onclick=()=>{state[selected]??={};state[selected][b.dataset.setperm]=Number(b.dataset.v);draw()})};draw();
    $('syncNow').onclick=async()=>{if(type==='channel'){const ch=await getDoc(doc(db,'channels',id));const c=ch.data();if(!c.categoryId)return toast('Kanał nie ma kategorii');const cat=await getDoc(doc(db,'categories',c.categoryId));if(!cat.exists())return;await updateDoc(ch.ref,{permissionOverwrites:cat.data().permissionOverwrites||{},syncWithCategory:true,...buildSendPermissionMeta(cat.data().permissionOverwrites||{},roles)});toast('Uprawnienia zsynchronizowane','success');return}const chs=await getDocs(query(collection(db,'channels'),where('serverId','==',currentServer.id),limit(200)));for(const ch of chs.docs)if(ch.data().categoryId===id&&ch.data().syncWithCategory)await updateDoc(ch.ref,{permissionOverwrites:state,...buildSendPermissionMeta(state,roles)});toast('Zsynchronizowano kanały','success')};
    $('permSave').onclick=async()=>{const meta=buildSendPermissionMeta(state,roles);await updateDoc(parent.ref,{permissionOverwrites:state,...meta});if(type==='category'){const chs=await getDocs(query(collection(db,'channels'),where('serverId','==',currentServer.id),limit(200)));for(const ch of chs.docs)if(ch.data().categoryId===id&&ch.data().syncWithCategory)await updateDoc(ch.ref,{permissionOverwrites:state,...meta})}closeModal();toast('Uprawnienia zapisane','success')};
  });
}

async function serverInviteModal(id){if(!(await hasServerPermission('MANAGE_INVITES',id)))return toast('Nie masz uprawnienia do zarządzania zaproszeniami.','error');openModal(`<div class="modal-head"><h2>Zaproszenia na serwer</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><input id="inviteUserQ" placeholder="Nazwa lub Nazwa#1234"><div id="inviteUserResults" class="search-results"></div><button id="newInviteCode" class="btn primary">Utwórz kod zaproszenia</button><div id="inviteCodeArea" class="muted"></div></div>`,()=>{$('modalClose').onclick=closeModal;$('inviteUserQ').oninput=async()=>{const q=$('inviteUserQ').value.trim();if(q.length<2)return;$('inviteUserResults').innerHTML='Szukam…';const name=q.split('#')[0];const s=await getDocs(query(collection(db,'users'),where('username','>=',name),where('username','<=',name+'\uf8ff'),limit(10)));$('inviteUserResults').innerHTML=s.docs.map(d=>({uid:d.id,...d.data()})).filter(u=>u.uid!==me.uid).map(u=>`<div class="search-item">${avatarHTML(u,'sm')}<div class="member-copy"><b>${esc(u.displayName||u.username)}</b><small>${esc(tagOf(u))}</small></div><button class="pill primary" data-invite-user="${u.uid}">Zaproś</button></div>`).join('');$('inviteUserResults').querySelectorAll('[data-invite-user]').forEach(b=>b.onclick=async()=>{await addDoc(collection(db,'serverInvites'),{serverId:id,fromId:me.uid,toId:b.dataset.inviteUser,status:'pending',createdAt:serverTimestamp()});toast('Zaproszenie wysłane','success')})};$('newInviteCode').onclick=async()=>{const code=uid().slice(0,10);await addDoc(collection(db,'serverInvites'),{serverId:id,fromId:me.uid,code,status:'active',createdAt:serverTimestamp()});$('inviteCodeArea').textContent=`Kod: ${code}`;navigator.clipboard?.writeText(code).catch(()=>{})}})}

async function serverSettingsModal(id){if(!(await hasServerPermission('MANAGE_SERVER',id)))return toast('Nie masz uprawnienia do zarządzania serwerem.','error');const s=await getDoc(doc(db,'servers',id));if(!s.exists())return;const sv=s.data();let tab='overview';const tabs=[['overview','Przegląd'],['profile','Profil serwera'],...(await hasServerPermission('MANAGE_ROLES',id)?[['roles','Role']]:[]),...(await hasServerPermission('MANAGE_CHANNELS',id)?[['channels','Kanały i kategorie']]:[]),...(await hasServerPermission('MANAGE_MEMBERS',id)?[['members','Członkowie']]:[]),...((await hasServerPermission('BAN_MEMBERS',id))?[['moderation','Moderacja']]:[]),...((await hasServerPermission('MANAGE_INVITES',id))?[['invites','Zaproszenia']]:[]),...((await hasServerPermission('MANAGE_SERVER',id))?[['audit','Dziennik zdarzeń']]:[]),...((currentServer?.ownerId===me?.uid||isAdmin())?[['danger','Usuń serwer']]:[])];openModal(`<div class="modal-head"><h2>Ustawienia serwera</h2><button id="modalClose" class="icon-btn">×</button></div><div class="settings-layout"><nav class="settings-nav" id="settingsNav">${tabs.map(x=>`<button data-tab="${x[0]}">${esc(x[1])}</button>`).join('')}</nav><section id="settingsContent" class="settings-card"></section></div>`,()=>{$('modalClose').onclick=closeModal;const render=async()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const out=$('settingsContent');if(tab==='overview')out.innerHTML=`<div class="settings-section"><h3>Przegląd serwera</h3><p>Najważniejsze ustawienia społeczności i bezpieczeństwa.</p><label>Nazwa<input id="svName" value="${esc(sv.name||'')}" maxlength=80></label><label>Opis<textarea id="svDesc" rows="4" maxlength=300>${esc(sv.description||'')}</textarea></label><div class="settings-grid"><div class="setting-box"><b>Widoczność</b><div class="setting-row"><span>Serwer publiczny</span><button id="svPublic" class="switch ${(sv.public!==false)?'on':''}"></button></div><div class="setting-row"><span>Akceptuj prośby</span><button id="svApprove" class="switch ${sv.requireApproval?'on':''}"></button></div></div><div class="setting-box"><b>Domyślne zachowanie</b><label>Powiadomienia<select id="svNotify"><option value="all" ${(sv.defaultNotifications||'all')==='all'?'selected':''}>Wszystkie wiadomości</option><option value="mentions" ${(sv.defaultNotifications||'all')==='mentions'?'selected':''}>Tylko wzmianki</option></select></label><label>Filtr treści<select id="svFilter"><option value="off" ${(sv.contentFilter||'off')==='off'?'selected':''}>Wyłączony</option><option value="standard" ${(sv.contentFilter||'off')==='standard'?'selected':''}>Standardowy</option><option value="strict" ${(sv.contentFilter||'off')==='strict'?'selected':''}>Surowy</option></select></label></div></div><button id="svSave" class="btn primary">Zapisz ustawienia</button></div>`;
else if(tab==='profile')out.innerHTML=`<div class="settings-section"><h3>Profil serwera</h3><p>Ikona i banner widoczne dla członków.</p><label>Ikona URL<input id="svIcon" value="${esc(sv.icon||'')}"></label><label>Banner URL<input id="svBanner" value="${esc(sv.banner||'')}"></label><button id="svProfileSave" class="btn primary">Zapisz</button></div>`;
else if(tab==='roles'){const rs=(await getDocs(query(collection(db,'serverRoles'),where('serverId','==',id),limit(100)))).docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.position??0)-(a.position??0));rs.forEach(r=>cacheRoles.set(r.id,r));out.innerHTML=`<div class="settings-section"><h3>Role</h3><p>Przeciągaj role, ustawiaj grupy i uprawnienia.</p><div id="rolesList" class="role-list">${rs.map(r=>`<div class="role-item" draggable="${!r.isEveryone}" data-roleid="${r.id}"><span class="drag-handle">⋮⋮</span><span class="role-color" style="background:${esc(r.color||'#99aab5')}"></span><b>${esc(r.name)}</b><span class="role-meta-pills"><span class="muted">${r.hoist?'Grupa':''}</span>${r.mentionable?'<span class="mentionable-chip">@</span>':''}</span><button class="mini" data-edit-role="${r.id}">Edytuj</button></div>`).join('')}</div><button id="newRole" class="btn primary">Nowa rola</button></div>`;wireRoleDrag();$('newRole').onclick=()=>roleModal();out.querySelectorAll('[data-edit-role]').forEach(b=>b.onclick=()=>roleModal(b.dataset.editRole));}
else if(tab==='channels'){out.innerHTML=`<div class="settings-section"><h3>Kanały i kategorie</h3><p>Zarządzaj strukturą serwera.</p><button id="newCatS" class="pill">＋ Kategoria</button><button id="newChS" class="pill">＋ Kanał</button><div style="margin-top:16px" id="settingsTree"></div></div>`;await loadSettingsTree();$('newCatS').onclick=()=>categoryModal();$('newChS').onclick=()=>channelModal({categoryId:null});}
else if(tab==='members'){const arr=cacheMembers.get(id)||[];out.innerHTML=`<div class="settings-section"><h3>Członkowie</h3><p>Kliknij osobę, aby zarządzać rolami i moderacją.</p><div class="friend-list">${arr.map(m=>{const r=roleForMember(id,m.userId);return `<div class="friend-row">${avatarHTML(m.user,'sm')}<div class="member-copy"><b style="${r?.color?`color:${esc(r.color)}`:''}">${esc(m.nickname||m.user.displayName||m.user.username)}</b><small>${esc(tagOf(m.user))}${r?` · ${esc(r.name)}`:''}</small></div><div class="friend-actions"><button class="pill" data-manage-member="${m.userId}">Zarządzaj</button></div></div>`}).join('')||'<div class="empty-state">Brak członków.</div>'}</div></div>`;out.querySelectorAll('[data-manage-member]').forEach(b=>b.onclick=()=>memberManageModal(id,b.dataset.manageMember));}
else if(tab==='moderation')out.innerHTML=`<div class="settings-section"><h3>Moderacja</h3><p>Zasady bezpieczeństwa i bany.</p><button id="banListBtn" class="pill">Lista banów</button><div class="setting-row"><span>Ogranicz linki</span><button class="switch"></button></div><div class="setting-row"><span>Filtruj zaproszenia</span><button class="switch on"></button></div></div>`;
else if(tab==='invites')out.innerHTML=`<div class="settings-section"><h3>Zaproszenia</h3><p>Zarządzaj kodami zaproszeń.</p><button id="createInviteSetting" class="btn primary">Utwórz kod</button><div id="settingInvites" class="search-results" style="margin-top:12px"></div></div>`;
else if(tab==='audit')out.innerHTML=`<div class="settings-section"><h3>Dziennik zdarzeń</h3><p>Ostatnie akcje administracyjne.</p><div id="auditRows" class="search-results"></div></div>`;
else out.innerHTML=`<div class="settings-section"><h3>Usuń serwer</h3><p>Ta operacja jest nieodwracalna.</p><button id="deleteServerFinal" class="btn primary" style="background:#b83c49">Usuń serwer</button></div>`;
if(tab==='overview'){$('svPublic').onclick=()=>{$('svPublic').classList.toggle('on')};$('svApprove').onclick=()=>{$('svApprove').classList.toggle('on')};$('svSave').onclick=async()=>{const name=$('svName').value.trim();if(!name)return toast('Nazwa serwera nie może być pusta','error');const isPublic=$('svPublic').classList.contains('on'),approve=$('svApprove').classList.contains('on');const defaultNotifications=$('svNotify').value,contentFilter=$('svFilter').value;await updateDoc(s.ref,{name,description:$('svDesc').value.trim(),public:isPublic,requireApproval:approve,defaultNotifications,contentFilter});Object.assign(sv,{name,description:$('svDesc').value.trim(),public:isPublic,requireApproval:approve,defaultNotifications,contentFilter});currentServer={id,...sv};cacheServers.set(id,currentServer);$('serverNameText').textContent=sv.name;$('serverDescText').textContent=sv.description;toast('Zapisano ustawienia','success')}}
if(tab==='profile')$('svProfileSave').onclick=async()=>{await updateDoc(s.ref,{icon:$('svIcon').value.trim(),banner:$('svBanner').value.trim()});sv.icon=$('svIcon').value.trim();sv.banner=$('svBanner').value.trim();currentServer={id,...sv};$('serverBannerImage').style.backgroundImage=sv.banner?`url("${sv.banner}")`:'none';toast('Profil serwera zapisany','success')};
if(tab==='moderation')$('banListBtn').onclick=()=>banListModal(id);
if(tab==='invites'){const s2=await getDocs(query(collection(db,'serverInvites'),where('serverId','==',id),limit(100)));$('settingInvites').innerHTML=s2.docs.map(d=>`<div class="search-item"><b>${esc(d.data().code||'Zaproszenie bez kodu')}</b><span class="muted">${esc(d.data().status||'active')}</span></div>`).join('')||'<div class="muted">Brak zaproszeń.</div>';$('createInviteSetting').onclick=async()=>{const code=uid().slice(0,10);await addDoc(collection(db,'serverInvites'),{serverId:id,fromId:me.uid,code,status:'active',createdAt:serverTimestamp()});toast(`Kod: ${code}`,'success');render()}};
if(tab==='audit'){const a=await getDocs(query(collection(db,'auditLogs'),where('serverId','==',id),limit(100)));$('auditRows').innerHTML=a.docs.map(d=>`<div class="search-item"><span>${esc(d.data().action||'akcja')}</span><small class="muted">${dateText(d.data().createdAt)}</small></div>`).join('')||'<div class="muted">Brak zdarzeń.</div>'};if(tab==='danger')$('deleteServerFinal').onclick=async()=>{if(!confirm('Na pewno usunąć serwer?'))return;await deleteDoc(s.ref);closeModal();renderHome()};};document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});render();})}
async function loadSettingsTree(){const cats=await getDocs(query(collection(db,'categories'),where('serverId','==',currentServer.id),limit(100)));const ch=await getDocs(query(collection(db,'channels'),where('serverId','==',currentServer.id),limit(200)));const cm=new Map(cats.docs.map(d=>[d.id,{id:d.id,...d.data()}]));const groups=[...cm.values()].sort((a,b)=>(a.position??0)-(b.position??0));const by=new Map(groups.map(c=>[c.id,[]]));const unc=[];ch.docs.forEach(d=>{const x={id:d.id,...d.data()};if(by.has(x.categoryId))by.get(x.categoryId).push(x);else unc.push(x)});$('settingsTree').innerHTML=groups.map(c=>`<div class="setting-box"><b>${esc(c.name)}</b>${(by.get(c.id)||[]).sort((a,b)=>(a.position??0)-(b.position??0)).map(x=>`<div class="setting-row"><span># ${esc(x.name)}</span><span class="muted">${x.syncWithCategory?'zsynchronizowany':''}</span></div>`).join('')}</div>`).join('')+(unc.length?`<div class="setting-box"><b>Bez kategorii</b>${unc.map(x=>`<div class="setting-row"><span># ${esc(x.name)}</span></div>`).join('')}</div>`:'');}
function wireRoleDrag(){const el=$('rolesList');if(!el)return;el.querySelectorAll('[data-roleid]').forEach(row=>{row.ondragstart=e=>e.dataTransfer.setData('text/plain',row.dataset.roleid);row.ondragover=e=>{e.preventDefault();row.classList.add('drag-over')};row.ondragleave=()=>row.classList.remove('drag-over');row.ondrop=async e=>{e.preventDefault();row.classList.remove('drag-over');if(!(await hasServerPermission('MANAGE_ROLES')))return toast('Nie masz uprawnienia do zarządzania rolami.','error');const a=e.dataTransfer.getData('text/plain'),b=row.dataset.roleid;if(a===b)return;const [ra,rb]=await Promise.all([getDoc(doc(db,'serverRoles',a)),getDoc(doc(db,'serverRoles',b))]);if(!ra.exists()||!rb.exists())return;const batch=writeBatch(db);batch.update(ra.ref,{position:rb.data().position});batch.update(rb.ref,{position:ra.data().position});await batch.commit();serverSettingsModal(currentServer.id);}})}
async function roleModal(id){if(!(await hasServerPermission('MANAGE_ROLES')))return toast('Nie masz uprawnienia do zarządzania rolami.','error');const s=id?await getDoc(doc(db,'serverRoles',id)):null;const d=s?.data()||{name:'Nowa rola',color:'#5865f2',position:1,permissions:[],hoist:false,mentionable:false,isEveryone:false};let permissions=new Set(d.permissions||[]);openModal(`<div class="modal-head"><h2>${id?'Edytuj rolę':'Nowa rola'}</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><label>Nazwa<input id="roleName" value="${esc(d.name||'')}"></label><label>Kolor<input id="roleColor" type="color" value="${esc(d.color||'#5865f2')}"></label><label class="check-line"><input type="checkbox" id="roleHoist" ${d.hoist?'checked':''}> Oddziel tę rolę na liście członków</label><label class="check-line"><input type="checkbox" id="roleMention" ${d.mentionable?'checked':''}> Pozwól na oznaczanie roli</label><div class="setting-box"><b>Uprawnienia</b>${Object.entries(permissionGroups).map(([g,ps])=>`<div class="perm-section-title">${g}</div>${ps.map(p=>`<label class="check-line"><input type="checkbox" data-rperm="${p}" ${permissions.has(p)?'checked':''}> ${esc(permissionMeta[p][0])}</label>`).join('')}`).join('')}</div></div><div class="modal-foot"><button id="modalCancel" class="pill">Anuluj</button>${id&&!d.isEveryone?'<button id="roleDelete" class="pill danger-text">Usuń</button>':''}<button id="roleSave" class="btn primary" style="margin:0">Zapisz</button></div>`,()=>{$('modalClose').onclick=closeModal;$('modalCancel').onclick=closeModal;$('roleSave').onclick=async()=>{document.querySelectorAll('[data-rperm]').forEach(x=>x.checked?permissions.add(x.dataset.rperm):permissions.delete(x.dataset.rperm));const data={serverId:currentServer.id,name:$('roleName').value.trim(),color:$('roleColor').value,position:d.position??1,permissions:[...permissions],hoist:$('roleHoist').checked,mentionable:$('roleMention').checked,isEveryone:!!d.isEveryone};if(id)await updateDoc(s.ref,data);else await addDoc(collection(db,'serverRoles'),data);await syncServerMemberPermissions(currentServer.id);closeModal();toast('Rola zapisana','success');serverSettingsModal(currentServer.id)};if($('roleDelete'))$('roleDelete').onclick=async()=>{if(!confirm('Usunąć rolę?'))return;await deleteDoc(s.ref);closeModal();serverSettingsModal(currentServer.id)}})}

async function memberManageModal(serverId,userId){
  if(!currentServer || currentServer.id!==serverId)return;
  const isSelf=userId===me.uid;
  const isOwner=currentServer.ownerId===userId;
  const canRoleManage=await hasServerPermission('MANAGE_ROLES',serverId);
  const canMemberManage=await hasServerPermission('MANAGE_MEMBERS',serverId);
  const canKick=await hasServerPermission('KICK_MEMBERS',serverId);
  const canBan=await hasServerPermission('BAN_MEMBERS',serverId);
  const canSelfManage=isSelf && (canRoleManage || isAdmin() || currentServer.ownerId===me.uid);
  if(isSelf && !canSelfManage)return toast('Nie masz uprawnienia do zarządzania rolami na tym serwerze.','error');
  if(isOwner && !isSelf)return toast('Właściciela serwera nie można moderować.','error');

  let member=await getDoc(doc(db,'serverMembers',`${serverId}_${userId}`));
  if(!member.exists()){
    if(!isSelf)return toast('Nie znaleziono członka.','error');
    const seed={serverId,userId,roleIds:[],nickname:'',timeoutUntil:null,joinedAt:serverTimestamp()};
    await setDoc(doc(db,'serverMembers',`${serverId}_${userId}`),seed,{merge:true});
    member=await getDoc(doc(db,'serverMembers',`${serverId}_${userId}`));
  }
  const u=await getUser(userId);
  const d=member.data()||{};
  const roles=(await getDocs(query(collection(db,'serverRoles'),where('serverId','==',serverId),limit(100)))).docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.position??0)-(a.position??0));
  roles.forEach(r=>cacheRoles.set(r.id,r));
  const actor=memberFor(serverId,me.uid);
  const actorPos=isAdmin()||currentServer.ownerId===me.uid?Infinity:((actor?.roleIds||[]).map(x=>cacheRoles.get(x)).filter(Boolean).reduce((n,r)=>Math.max(n,Number(r.position??0)),-1));
  const manageable=roles.filter(r=>!r.isEveryone&&canRoleManage&&(isAdmin()||currentServer.ownerId===me.uid||Number(r.position??0)<actorPos));
  const currentRoles=(d.roleIds||[]).map(x=>cacheRoles.get(x)).filter(Boolean);
  const targetHighest=currentRoles.reduce((n,r)=>Math.max(n,Number(r.position??0)),-1);
  const canModerate=!isSelf && currentServer.ownerId!==userId && (isAdmin()||currentServer.ownerId===me.uid||targetHighest<actorPos) && (canMemberManage||canKick||canBan);
  const title=isSelf?'Zarządzaj swoim profilem na serwerze':'Zarządzaj członkiem';
  const info=isSelf?'<div class="manage-self-note">Możesz tutaj ustawić swój nick i role na tym serwerze. Moderacja własnego konta jest wyłączona.</div>':'';
  openModal(`<div class="modal-head"><div class="member-manage-head">${avatarHTML(u,'sm')}<div><h2>${title}</h2><small>${esc(u.displayName||u.username)} · ${esc(tagOf(u))}</small></div></div><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body member-manage">${info}<label>Nick na tym serwerze<input id="memberNick" maxlength="32" value="${esc(d.nickname||'')}" placeholder="Pozostaw puste, aby użyć nazwy konta"></label><div class="setting-box"><div class="manage-section-head"><b>Role</b><span class="muted">${currentRoles.length} przypisanych</span></div><div class="member-role-picker">${manageable.map(r=>`<label class="role-pick-row"><input type="checkbox" data-mrole="${r.id}" ${(d.roleIds||[]).includes(r.id)?'checked':''}><span class="role-pick-color" style="background:${esc(r.color||'#5865f2')}"></span><span class="role-pick-name" style="color:${esc(r.color||'#fff')}">${esc(r.name)}</span>${r.mentionable?'<span class="mentionable-chip">@</span>':''}</label>`).join('')||'<div class="muted">Nie masz uprawnień do zarządzania tymi rolami.</div>'}</div></div><div class="settings-grid">${canModerate?'<button id="kickBtn" class="pill">Wyrzuć</button><button id="timeoutBtn" class="pill">Timeout</button><button id="banBtn" class="pill danger-text">Ban</button>':''}</div></div><div class="modal-foot"><button id="modalCancel" class="pill">Anuluj</button><button id="saveMember" class="btn primary" style="margin:0">Zapisz</button></div>`,()=>{
    $('modalClose').onclick=closeModal;$('modalCancel').onclick=closeModal;
    $('saveMember').onclick=async()=>{try{
      const checked=new Set([...document.querySelectorAll('[data-mrole]:checked')].map(x=>x.dataset.mrole));
      if(!isSelf && !canRoleManage && checked.size)return toast('Nie masz uprawnienia do nadawania ról.','error');
      if(!isSelf && !canMemberManage && $('memberNick').value.trim()!==String(d.nickname||''))return toast('Nie masz uprawnienia do zmiany nicków członków.','error');
      const manageableIds=new Set(manageable.map(r=>r.id));
      const roleIds=[...(d.roleIds||[]).filter(id=>!manageableIds.has(id)),...checked];
      const serverPermissions=await computeServerPermissions(serverId,roleIds);
      await updateDoc(member.ref,{roleIds,nickname:$('memberNick').value.trim(),serverPermissions});
      const fresh={...(member.data()||{}),roleIds,nickname:$('memberNick').value.trim(),userId};
      const arr=cacheMembers.get(serverId)||[]; const ix=arr.findIndex(x=>x.userId===userId); if(ix>=0)arr[ix]={...arr[ix],...fresh}; else arr.push({...fresh,user:u}); cacheMembers.set(serverId,arr); renderMembers(arr);
      toast(isSelf?'Twój profil serwerowy zapisany':'Zapisano członka','success');closeModal()
    }catch(e){toast('Nie udało się zapisać: '+e.message,'error')}};
    if($('kickBtn'))$('kickBtn').onclick=async()=>{if(!canKick)return toast('Nie masz uprawnienia do wyrzucania członków.','error');if(userId===me.uid||currentServer.ownerId===userId)return toast('Nie możesz wyrzucić tego użytkownika.','error');if(!confirm('Wyrzucić tego członka z serwera?'))return;await updateDoc(doc(db,'servers',serverId),{members:arrayRemove(userId)});await deleteDoc(member.ref);await addDoc(collection(db,'auditLogs'),{serverId,userId:me.uid,targetId:userId,action:'kick',createdAt:serverTimestamp()});toast('Użytkownik wyrzucony');closeModal()};
    if($('timeoutBtn'))$('timeoutBtn').onclick=async()=>{if(!canMemberManage)return toast('Nie masz uprawnienia do timeoutu.','error');if(userId===me.uid||currentServer.ownerId===userId)return toast('Nie możesz nadać sobie timeoutu ani właścicielowi.','error');const mins=Number(prompt('Liczba minut timeoutu:','10')||0);if(mins>0){await updateDoc(member.ref,{timeoutUntil:new Date(Date.now()+mins*60000)});await addDoc(collection(db,'auditLogs'),{serverId,userId:me.uid,targetId:userId,action:`timeout ${mins}m`,createdAt:serverTimestamp()});toast('Timeout ustawiony');closeModal()}};
    if($('banBtn'))$('banBtn').onclick=async()=>{if(!canBan)return toast('Nie masz uprawnienia do banowania.','error');if(userId===me.uid||currentServer.ownerId===userId)return toast('Nie możesz zbanować siebie ani właściciela serwera.','error');if(!confirm('Na pewno zbanować tego użytkownika?'))return;const reason=prompt('Powód bana:','')||'';await setDoc(doc(db,'bans',`${serverId}_${userId}`),{serverId,userId,reason,bannedBy:me.uid,createdAt:serverTimestamp()});await updateDoc(doc(db,'servers',serverId),{members:arrayRemove(userId)});await deleteDoc(member.ref);await addDoc(collection(db,'auditLogs'),{serverId,userId:me.uid,targetId:userId,action:'ban',reason,createdAt:serverTimestamp()});toast('Użytkownik zbanowany');closeModal()};
  });
}
async function banListModal(serverId){const s=await getDocs(query(collection(db,'bans'),where('serverId','==',serverId),limit(200)));openModal(`<div class="modal-head"><h2>Bany</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><div class="friend-list">${(await Promise.all(s.docs.map(async d=>{const x=d.data(),u=await getUser(x.userId);return `<div class="friend-row">${avatarHTML(u,'sm')}<div class="member-copy"><b>${esc(u.displayName||u.username)}</b><small>${esc(x.reason||'Brak powodu')}</small></div><button class="pill" data-unban="${x.userId}">Odbanuj</button></div>`}))).join('')||'<div class="empty-state">Brak banów.</div>'}</div></div>`,()=>{$('modalClose').onclick=closeModal;document.querySelectorAll('[data-unban]').forEach(b=>b.onclick=async()=>{await deleteDoc(doc(db,'bans',`${serverId}_${b.dataset.unban}`));toast('Odbanowano');banListModal(serverId)})})}

async function getMutualProfileData(target){const user=(typeof target==='string')?await getUser(target):target;if(!user)return {mutualFriends:[],mutualServers:[]};const set=new Set(user.friends||[]);const ids=(me.friends||[]).filter(id=>set.has(id)).slice(0,8);const mutualFriends=await Promise.all(ids.map(getUser));let mutualServers=[];try{const snap=await getDocs(query(collection(db,'servers'),where('members','array-contains',me.uid),limit(100)));mutualServers=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>(x.members||[]).includes(user.uid)).slice(0,8)}catch(e){console.warn('mutual servers',e)}return {mutualFriends:mutualFriends.filter(Boolean),mutualServers}}
function openProfile(userId,anchor){currentProfileUid=userId;const anchorRect=anchor?.getBoundingClientRect?.()||{left:window.innerWidth/2,top:window.innerHeight/2,width:0,height:0};const layer=$('profileLayer');layer.innerHTML='<div id="profileMount"></div>';layer.classList.remove('hidden');const mount=$('profileMount');Promise.all([getUser(userId),getMutualProfileData(userId)]).then(([u,mutual])=>{if(!u)return;const width=370,left=Math.min(window.innerWidth-width-14,Math.max(10,anchorRect.left+anchorRect.width+12));const top=Math.min(window.innerHeight-600,Math.max(10,anchorRect.top-12));mount.innerHTML=`<article class="profile-pop profile-pop-rich" style="left:${left}px;top:${top}px"><div class="profile-banner" style="background-image:url('${esc(u.banner||'')}')"><button id="profileClose" class="profile-close">×</button></div><div class="profile-main"><div class="profile-avatar avatar avatar-lg">${u.avatar?`<img src="${esc(u.avatar)}">`:`<span class="avatar-letter">${esc((u.displayName||u.username||'?').slice(0,1).toUpperCase())}</span>`}<span class="presence-dot presence-${statusOf(u)}"></span></div><div class="profile-name-row"><b class="profile-name">${esc(u.displayName||u.username)}</b><span class="profile-tag">${esc(tagOf(u))}</span></div><div class="status-badge"><span class="presence-dot-inline presence-${statusOf(u)}"></span>${esc(statuses[statusOf(u)].label)}${u.customStatus?` · ${esc(u.customStatus)}`:''}</div><div class="profile-tabs"><button class="profile-tab active" data-pt="profile">Profil</button><button class="profile-tab" data-pt="activity">Aktywność</button></div><div id="profileTabBody" class="profile-section"></div><div class="profile-actions" id="profileActions"></div></div></article>`;$('profileClose').onclick=closeProfile;const draw=t=>{document.querySelectorAll('[data-pt]').forEach(x=>x.classList.toggle('active',x.dataset.pt===t));$('profileTabBody').innerHTML=t==='profile'?`<div><b>O mnie</b><div class="profile-bio">${esc(u.bio||'Brak opisu.')}</div></div><div class="profile-social-grid"><div class="profile-social-box"><b>Wspólni znajomi</b><span>${mutual.mutualFriends.length}</span><small>${mutual.mutualFriends.slice(0,3).map(x=>esc(x.displayName||x.username)).join(', ')||'Brak wspólnych znajomych'}</small></div><div class="profile-social-box"><b>Wspólne serwery</b><span>${mutual.mutualServers.length}</span><small>${mutual.mutualServers.slice(0,3).map(x=>esc(x.name)).join(', ')||'Brak wspólnych serwerów'}</small></div></div><div style="margin-top:15px"><b>Odznaki</b><div class="badge-grid" style="margin-top:8px">${badgesHTML(u)||'<span class="muted">Brak odznak.</span>'}</div></div>`:`<div class="activity-card"><b>Aktywność</b><div style="margin-top:6px;color:#c7ccd5">${esc(u.activity||'Brak aktywności')}</div></div>`};draw('profile');document.querySelectorAll('[data-pt]').forEach(x=>x.onclick=()=>draw(x.dataset.pt));const actions=$('profileActions');if(userId!==me.uid){actions.innerHTML=`<button id="profileMsg" class="pill primary">Wiadomość</button><button id="profileFriend" class="pill">${(me.friends||[]).includes(userId)?'Usuń znajomego':'Dodaj znajomego'}</button><button id="profileBlock" class="pill">${(me.blocked||[]).includes(userId)?'Odblokuj':'Zablokuj'}</button>`;$('profileMsg').onclick=()=>{closeProfile();openDM(userId)};$('profileFriend').onclick=async()=>{if((me.friends||[]).includes(userId))await removeFriend(userId);else await sendFriendRequest(userId)};$('profileBlock').onclick=()=>((me.blocked||[]).includes(userId)?unblockUser(userId):blockUser(userId))}else{actions.innerHTML=`<button id="profileEdit" class="pill primary">Edytuj profil</button>`;$('profileEdit').onclick=settingsModal}if(isAdmin()){actions.insertAdjacentHTML('beforeend','<button id="badgeAdmin" class="pill">Odznaki</button>');$('badgeAdmin').onclick=()=>badgeAdminModal(userId)}}).catch(e=>{console.error('openProfile',e);toast('Nie udało się otworzyć profilu','error')})}
function memberContextItems(userId){
  const selfUser=userId===me.uid;
  return [
    {label:'Profil',fn:()=>openProfile(userId,null)},
    ...(selfUser?[{label:'Zarządzaj swoim profilem na serwerze',fn:()=>memberManageModal?.(currentServer?.id,userId)}]:[
      {label:'Wyślij wiadomość',fn:()=>openDM(userId)},
      {label:'Dodaj do znajomych',fn:()=>sendFriendRequest(userId)},
      {label:'Zablokuj',danger:true,fn:()=>blockUser(userId)},
      {sep:true},
      {label:'Zarządzaj członkiem',fn:()=>memberManageModal?.(currentServer?.id,userId)}
    ]),
    {label:'Kopiuj ID',fn:()=>navigator.clipboard?.writeText(userId)}
  ];
}

function closeProfile(){$('profileLayer').classList.add('hidden');$('profileLayer').innerHTML='';currentProfileUid=null}

function statusMenu(){openModal(`<div class="modal-head"><h2>Ustaw status</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body">${Object.entries(statuses).filter(([k])=>k!=='offline').map(([k,v])=>`<button class="nav-row" data-status="${k}"><span class="status-dot-preview status-${k}">${v.symbol}</span>${v.label}</button>`).join('')}</div>`,()=>{$('modalClose').onclick=closeModal;document.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{await updateDoc(doc(db,'users',me.uid),{status:b.dataset.status});me.status=b.dataset.status;setUserBar();closeModal();toast('Status zmieniony','success')})})}
function settingsModal(){let section='account';openModal(`<div class="modal-head"><h2>Ustawienia użytkownika</h2><button id="modalClose" class="icon-btn">×</button></div><div class="settings-layout"><nav id="userSettingsNav" class="settings-nav">${[['account','Konto'],['profile','Profil'],['appearance','Wygląd'],['notifications','Powiadomienia'],['keybinds','Skróty klawiszowe']].map(x=>`<button data-uset="${x[0]}">${x[1]}</button>`).join('')}</nav><section id="userSettingsBody" class="settings-card"></section></div>`,()=>{$('modalClose').onclick=closeModal;const render=async()=>{document.querySelectorAll('[data-uset]').forEach(b=>b.classList.toggle('active',b.dataset.uset===section));if(section==='account')$('userSettingsBody').innerHTML=`<div class="settings-section"><h3>Konto</h3><p></p><label>Nazwa użytkownika<input id="setUsername" value="${esc(me.username||me.displayName||'')}"></label><div class="setting-box"><b>Zmiana nazwy: raz na 7 dni</b><small class="muted">${me.usernameChangedAt&&tsMs(me.usernameChangedAt)?`Ostatnia zmiana: ${dateText(me.usernameChangedAt)}`:'Nie zmieniano jeszcze nazwy.'}</small></div><div class="setting-box"><b>Twój stały tag</b><div style="font-size:20px;margin-top:8px">${esc(`#${String(me.discriminator).padStart(4,'0')}`)}</div><small class="muted">Tagu nie można zmienić.</small></div><button id="saveAccount" class="btn primary">Zapisz nazwę</button><button id="logoutNow" class="pill" style="margin-left:8px">Wyloguj</button></div>`;
else if(section==='profile')$('userSettingsBody').innerHTML=`<div class="settings-section"><h3>Profil</h3><label>Bio<textarea id="setBio" rows="4">${esc(me.bio||'')}</textarea></label><label>Custom status<input id="setCustom" value="${esc(me.customStatus||'')}"></label><label>Aktywność<input id="setActivity" value="${esc(me.activity||'')}"></label><label>Avatar URL<input id="setAvatar" value="${esc(me.avatar||'')}"></label><label>Banner URL<input id="setBanner" value="${esc(me.banner||'')}"></label><button id="saveProfile" class="btn primary">Zapisz profil</button></div>`;
else if(section==='appearance')$('userSettingsBody').innerHTML=`<div class="settings-section"><h3>Wygląd</h3><p>Dostosuj wygląd interfejsu.</p><div class="setting-row"><span>Tryb kompaktowy</span><button id="compactSwitch" class="switch"></button></div></div>`;
else if(section==='notifications')$('userSettingsBody').innerHTML=`<div class="settings-section"><h3>Powiadomienia</h3><div class="setting-row"><span>Powiadomienia o wiadomościach</span><button class="switch on"></button></div><div class="setting-row"><span>Wzmianki</span><button class="switch on"></button></div><div class="setting-row"><span>Dźwięki interfejsu</span><button class="switch"></button></div></div>`;
else $('userSettingsBody').innerHTML=`<div class="settings-section"><h3>Skróty klawiszowe</h3><div class="hotkey-list"><div><kbd>Ctrl K</kbd><span>Wyszukiwanie</span></div><div><kbd>Ctrl Shift F</kbd><span>Znajomi</span></div><div><kbd>Ctrl Shift P</kbd><span>Profil</span></div><div><kbd>Ctrl Shift M</kbd><span>Członkowie</span></div><div><kbd>Ctrl Shift C</kbd><span>Nowy kanał</span></div><div><kbd>Esc</kbd><span>Zamknij popup</span></div></div></div>`;
if(section==='account'){$('saveAccount').onclick=saveUsername;$('logoutNow').onclick=async()=>{await goOffline();await signOut(auth)}}if(section==='profile')$('saveProfile').onclick=async()=>{const name=me.username;const data={bio:$('setBio').value.trim(),customStatus:$('setCustom').value.trim(),activity:$('setActivity').value.trim(),avatar:$('setAvatar').value.trim(),banner:$('setBanner').value.trim(),username:name,displayName:name,discriminator:me.discriminator};await updateDoc(doc(db,'users',me.uid),data);Object.assign(me,data);await updateProfile(auth.currentUser,{displayName:name});setUserBar();closeModal();toast('Profil zapisany','success')};};document.querySelectorAll('[data-uset]').forEach(b=>b.onclick=()=>{section=b.dataset.uset;render()});render();})}
async function saveUsername(){
  const name=$('setUsername').value.trim().replace(/\s+/g,' ').slice(0,32);
  if(name.length<2)return toast('Nazwa jest za krótka','error');
  if(name===me.username)return toast('To już jest Twoja nazwa.');
  const changed=tsMs(me.usernameChangedAt);
  if(changed&&Date.now()-changed<7*24*60*60*1000){const left=7*24*60*60*1000-(Date.now()-changed);return toast(`Nazwę możesz zmienić ponownie za ${Math.ceil(left/86400000)} dni.`,'error')}
  const q=query(collection(db,'users'),where('username','==',name),limit(10));const s=await getDocs(q);if(s.docs.some(d=>d.id!==me.uid))return toast('Ta nazwa jest zajęta','error');
  await updateDoc(doc(db,'users',me.uid),{username:name,displayName:name,usernameChangedAt:serverTimestamp()});await updateProfile(auth.currentUser,{displayName:name});me.username=name;me.displayName=name;me.usernameChangedAt={toMillis:()=>Date.now()};cacheUsers.set(me.uid,me);setUserBar();toast('Nazwa zmieniona','success')
}
async function showBots(){
  $('membersPane')?.classList.add('hidden');
  currentPage='bots'; currentServer=null; currentChannel=null; currentDMUser=null;
  $('homeSidebar')?.classList.remove('hidden'); $('serverSidebar')?.classList.add('hidden');
  setPageNav('bots');
  renderTop();
  const host=$('mainContent');
  if(!host)return;
  host.innerHTML=`<div class="bots-page"><div class="page-head"><div><div class="hero-eyebrow">PRIVATECORD</div><h1>Boty</h1><p class="muted">Twórz własne boty tekstowe, instaluj je na serwerach i pobieraj starter Pythona.</p></div><button id="createBotTop" class="btn primary">＋ Stwórz bota</button></div><div id="botGrid" class="bot-grid"><div class="empty-state">Ładowanie botów…</div></div></div>`;
  $('createBotTop').onclick=()=>botCreateModal();
  const grid=$('botGrid');
  try{
    const snap=await getDocs(query(collection(db,'bots'),where('ownerId','==',me.uid),limit(100)));
    const bots=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pl'));
    grid.innerHTML=bots.length?bots.map(b=>`<article class="bot-card">
      <div class="bot-card-head"><div class="bot-avatar">${esc((b.name||'B').slice(0,1).toUpperCase())}</div><div class="bot-card-title"><b>${esc(b.name||'Bot')}</b><span>${esc(b.botUserId||'')}</span></div><span class="bot-status ${b.enabled!==false?'':'off'}"></span></div>
      <p>${esc(b.description||'Brak opisu.')}</p>
      <div class="bot-card-meta"><span>Prefix: <b>${esc(b.commandPrefix||'!')}</b></span><span>${b.enabled!==false?'Aktywny':'Wyłączony'}</span></div>
      <div class="bot-card-actions"><button class="pill primary" data-bot-install="${b.id}">Dodaj na serwer</button><button class="pill" data-bot-edit="${b.id}">Edytuj</button><button class="pill" data-bot-python="${b.id}">Python</button><button class="pill danger-soft" data-bot-delete="${b.id}">Usuń</button></div>
    </article>`).join(''):`<div class="empty-state bot-empty"><div><h3>Nie masz jeszcze bota</h3><p>Stwórz pierwszego bota tekstowego PrivateCord.</p><button id="createBotEmpty" class="btn primary">Stwórz bota</button></div></div>`;
    $('createBotEmpty')?.addEventListener('click',()=>botCreateModal());
    grid.querySelectorAll('[data-bot-install]').forEach(b=>b.onclick=()=>botInstallModal(b.dataset.botInstall));
    grid.querySelectorAll('[data-bot-edit]').forEach(b=>b.onclick=()=>botCreateModal(b.dataset.botEdit));
    grid.querySelectorAll('[data-bot-python]').forEach(b=>b.onclick=()=>downloadPythonBot(b.dataset.botPython));
    grid.querySelectorAll('[data-bot-delete]').forEach(b=>b.onclick=()=>deleteBot(b.dataset.botDelete));
  }catch(e){
    console.error('showBots',e);
    grid.innerHTML=`<div class="empty-state"><h3>Nie udało się wczytać botów</h3><p>${esc(e.message||e)}</p></div>`;
  }
}
async function botCreateModal(id){
  let snap=null; let d={name:'Mój bot',description:'',commandPrefix:'!',enabled:true};
  if(id){try{snap=await getDoc(doc(db,'bots',id));if(!snap.exists())return toast('Bot nie istnieje','error');d={...d,...snap.data()};}catch(e){return toast('Nie można otworzyć bota: '+(e.message||e),'error')}}
  openModal(`<div class="modal-head"><div><h2>${id?'Ustawienia bota':'Stwórz bota'}</h2><p class="muted">Bot PrivateCord</p></div><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body bot-modal"><div class="bot-token-note"><span class="bot-token-icon">◈</span><div><b>Bezpieczny token bota</b><small>Token jest potrzebny do uruchomienia startera Pythona. Nie udostępniaj go innym osobom.</small></div></div><label>Nazwa bota<input id="botName" maxlength="32" value="${esc(d.name)}" placeholder="Mój bot"></label><label>Opis<textarea id="botDesc" rows="3" maxlength="180" placeholder="Co robi Twój bot?">${esc(d.description||'')}</textarea></label><div class="two-col"><label>Prefix<input id="botPrefix" maxlength="3" value="${esc(d.commandPrefix||'!')}"></label><label>Status<select id="botEnabled"><option value="1" ${d.enabled!==false?'selected':''}>Aktywny</option><option value="0" ${d.enabled===false?'selected':''}>Wyłączony</option></select></label></div>${id?`<div class="setting-box"><b>Token</b><div class="secret-line"><code id="botTokenText">${esc(d.token||'')}</code><button id="copyBotToken" class="pill">Kopiuj</button></div></div>`:'<div class="setting-box"><b>Token zostanie wygenerowany po utworzeniu</b><small class="muted">Zostanie pokazany na ekranie tylko raz.</small></div>'}</div><div class="modal-foot"><button id="modalCancel" class="pill">Anuluj</button><button id="botSave" class="btn primary" style="margin:0">${id?'Zapisz zmiany':'Utwórz bota'}</button></div>`,()=>{
    $('modalClose').onclick=closeModal;$('modalCancel').onclick=closeModal;
    if(id&&$('copyBotToken'))$('copyBotToken').onclick=()=>navigator.clipboard?.writeText(d.token||'').then(()=>toast('Token skopiowany','success'));
    $('botSave').onclick=async()=>{
      try{
        const name=$('botName').value.trim().replace(/\s+/g,' ').slice(0,32); if(name.length<2)return toast('Nazwa bota jest za krótka','error');
        const prefix=($('botPrefix').value.trim()||'!').slice(0,3); const enabled=$('botEnabled').value==='1';
        if(id){await updateDoc(snap.ref,{name,description:$('botDesc').value.trim(),commandPrefix:prefix,enabled,updatedAt:serverTimestamp()});closeModal();await showBots();toast('Bot zapisany','success');return;}
        const botId='bot_'+crypto.randomUUID().replaceAll('-','');
        const token='kjsc_'+crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
        const botRef=doc(db,'bots',botId);
        const data={ownerId:me.uid,name,description:$('botDesc').value.trim(),commandPrefix:prefix,enabled,token,tokenHint:token.slice(0,10)+'••••',botUserId:botId,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
        await setDoc(botRef,data);
        await setDoc(doc(db,'botProfiles',botId),{uid:botId,botId,ownerId:me.uid,username:name,displayName:name,discriminator:String(Math.floor(Math.random()*10000)).padStart(4,'0'),avatar:'',banner:'',bio:$('botDesc').value.trim(),status:'offline',sessionActive:false,lastSeen:null,activity:`Bot PrivateCord · prefix ${prefix}`,badges:[],isBot:true,createdAt:serverTimestamp()});
        closeModal();
        await showBots();
        openModal(`<div class="modal-head"><h2>Bot utworzony</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><div class="success-panel"><b>${esc(name)}</b><p>Twój token został wygenerowany. Skopiuj go teraz i zapisz w bezpiecznym miejscu.</p><div class="token-copy"><code>${esc(token)}</code><button id="copyNewToken" class="btn primary">Kopiuj token</button></div><p class="muted">Następnie użyj przycisku <b>Python</b> przy bocie, aby pobrać starter.</p></div></div>`,()=>{$('modalClose').onclick=closeModal;$('copyNewToken').onclick=()=>navigator.clipboard?.writeText(token).then(()=>toast('Token skopiowany','success'))});
      }catch(e){toast('Nie udało się zapisać bota: '+(e.message||e),'error');}
    };
  });
}
async function deleteBot(id){if(!confirm('Usunąć tego bota?'))return;try{await deleteDoc(doc(db,'bots',id));await deleteDoc(doc(db,'botProfiles',id)).catch(()=>{});const s=await getDocs(query(collection(db,'botInstallations'),where('botId','==',id),limit(200)));for(const d of s.docs)await deleteDoc(d.ref);await showBots();toast('Bot usunięty','success')}catch(e){toast('Nie udało się usunąć bota: '+(e.message||e),'error')}}
async function botInstallModal(id){const s=await getDoc(doc(db,'bots',id));if(!s.exists())return toast('Bot nie istnieje','error');const b={id:s.id,...s.data()};const sv=await getDocs(query(collection(db,'servers'),where('ownerId','==',me.uid),limit(100)));const options=sv.docs.map(d=>({id:d.id,...d.data()}));openModal(`<div class="modal-head"><div><h2>Dodaj ${esc(b.name)} na serwer</h2><p class="muted">Tylko serwery, których jesteś właścicielem.</p></div><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><label>Serwer<select id="botServerSelect">${options.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>${options.length?'':'<div class="empty-state">Nie masz własnego serwera.</div>'}</div><div class="modal-foot"><button id="modalCancel" class="pill">Anuluj</button><button id="installBot" class="btn primary" style="margin:0" ${options.length?'':'disabled'}>Dodaj bota</button></div>`,()=>{$('modalClose').onclick=closeModal;$('modalCancel').onclick=closeModal;$('installBot').onclick=async()=>{const sid=$('botServerSelect').value;if(!sid)return;await setDoc(doc(db,'botInstallations',`${id}_${sid}`),{botId:id,serverId:sid,botUserId:b.botUserId,ownerId:me.uid,enabled:true,roleIds:[],installedAt:serverTimestamp()});closeModal();if(currentServer?.id===sid)subscribeMembers();toast('Bot dodany na serwer','success')}})}
async function downloadPythonBot(id){
  const s=await getDoc(doc(db,'bots',id));
  if(!s.exists())return toast('Bot nie istnieje','error');
  const d={id:s.id,...s.data()};
  const safeName=(d.name||'privatecord-bot').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,32)||'privatecord_bot';
  const py=`import os
from privatecord_bot import PrivateCordBot

# Token możesz zostawić w zmiennej środowiskowej, aby nie trzymać go w kodzie.
BOT_TOKEN = os.getenv("PRIVATECORD_BOT_TOKEN", "${String(d.token||'').replaceAll('\"','\"')}")
SERVICE_ACCOUNT = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccount.json")

bot = PrivateCordBot(
    token=BOT_TOKEN,
    bot_id="${d.botUserId}",
    prefix="${String(d.commandPrefix||'!').replaceAll('"','\"')}",
    service_account=SERVICE_ACCOUNT,
    poll_seconds=2.0,
)

bot.run()
`;
  const cfg=JSON.stringify({firebase_service_account:'serviceAccount.json',bot_document_id:d.id,prefix:d.commandPrefix||'!',poll_seconds:2},null,2);
  const readme=`# ${d.name}

Starter bota PrivateCord.

## Uruchomienie
1. Zainstaluj Python 3.10+.
2. \`pip install -r requirements.txt\`.
3. Utwórz klucz konta usługi i zapisz go jako \`serviceAccount.json\`.
4. Uruchom \`python my_bot.py\`.

Bot obsługuje m.in. \`${d.commandPrefix||'!'}ping\`, \`${d.commandPrefix||'!'}help\`, \`${d.commandPrefix||'!'}say tekst\` i \`${d.commandPrefix||'!'}info\`.

Nie udostępniaj tokenu ani serviceAccount.json.
`;
  const req = 'firebase-admin>=6.5.0\n';
  const files=[[safeName+'_bot.py',py],[safeName+'_config.json',cfg],['README.md',readme],['requirements.txt',req]];
  for(const [name,text] of files){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),600);await new Promise(r=>setTimeout(r,90));}
  toast('Pobrano pliki startera Pythona','success');
}

function openModal(html,ready){closeProfile();const layer=$('modalLayer');layer.innerHTML=`<div class="modal">${html}</div>`;layer.classList.remove('hidden');ready?.(layer.querySelector('.modal'));return layer}
function closeModal(){const l=$('modalLayer');l.classList.add('hidden');l.innerHTML='';modalCleanup?.();modalCleanup=null}

async function globalSearchModal(){openModal(`<div class="modal-head"><h2>Wyszukiwanie</h2><button id="modalClose" class="icon-btn">×</button></div><div class="modal-body"><input id="globalQuery" placeholder="Szukaj użytkowników i serwerów…"><div id="globalResults" class="search-results"></div></div>`,()=>{$('modalClose').onclick=closeModal;$('globalQuery').oninput=()=>globalSearch($('globalQuery').value);setTimeout(()=>$('globalQuery').focus(),20)})}
async function globalSearch(term){const out=$('globalResults');if(!out)return;term=term.trim();if(term.length<2){out.innerHTML='';return}const m=/^(.+?)#(\d{4})$/u.exec(term);let html='';if(m){const username=m[1].trim(),disc=m[2];const users=await getDocs(query(collection(db,'users'),where('username','==',username),limit(20))).catch(()=>null);html+='<div class="search-label">OSOBY</div>';if(users){const arr=users.docs.map(d=>({uid:d.id,...d.data()})).filter(u=>u.uid!==me.uid&&String(u.discriminator||'').padStart(4,'0')===disc);html+=arr.map(u=>`<button class="search-item" data-profile="${u.uid}">${avatarHTML(u,'sm')}<span class="member-copy"><b>${esc(u.displayName||u.username)}</b><small>${esc(tagOf(u))}</small></span></button>`).join('')||'<div class="muted">Nie znaleziono dokładnie tej osoby.</div>'}else html+='<div class="muted">Nie udało się wyszukać osób.</div>'}else html+='<div class="search-label">OSOBY</div><div class="search-hint">Wpisz pełną nazwę wraz z tagiem, np. <b>LOP#4521</b>.</div>';const servers=await getDocs(query(collection(db,'servers'),limit(100))).catch(()=>null);html+='<div class="search-label">SERWERY</div>';if(servers){const arr=servers.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.name?.toLowerCase().includes(term.toLowerCase())&&s.public!==false);html+=arr.map(s=>`<button class="search-item" data-search-server="${s.id}">${s.icon?`<img class="avatar avatar-sm" src="${esc(s.icon)}">`:'<span class="avatar avatar-sm">K</span>'}<span class="member-copy"><b>${esc(s.name)}</b><small>${(s.members||[]).length} członków</small></span></button>`).join('')||'<div class="muted">Brak serwerów.</div>'}out.innerHTML=html;out.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>{closeModal();openProfile(b.dataset.profile,b)});out.querySelectorAll('[data-search-server]').forEach(b=>b.onclick=async()=>{closeModal();await joinServer(b.dataset.searchServer)})}

function setupShortcuts(){document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeProfile();$('contextMenu').classList.add('hidden');return}if(e.ctrlKey&&e.key.toLowerCase()==='k'){e.preventDefault();globalSearchModal();return}if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='f'){e.preventDefault();showFriends();return}if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();openProfile(me.uid,$('myProfileBtn'));return}if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='m'){e.preventDefault();$('membersPane').classList.toggle('hidden');if(currentServer)renderMembers(cacheMembers.get(currentServer.id)||[]);return}if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='c'){e.preventDefault();if(currentServer)channelModal({categoryId:currentChannel?.categoryId||null});return}if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='s'){e.preventDefault();if(currentServer)serverSettingsModal(currentServer.id);return}})}

function initUI(){
  $('loginBtn').onclick=login;
  $('toggleLoginPass').onclick=()=>{$('loginPass').type=$('loginPass').type==='password'?'text':'password'};
  $('homeBtn').onclick=renderHome;$('discoverBtn').onclick=showDiscover;$('addServerBtn').onclick=createServerModal;$('membersBtn').onclick=()=>{if(currentServer){$('membersPane').classList.toggle('hidden');renderMembers(cacheMembers.get(currentServer.id)||[])}};$('closeMembers').onclick=()=>$('membersPane').classList.add('hidden');$('memberSearch').oninput=()=>{if(currentServer)renderMembers(cacheMembers.get(currentServer.id)||[])};$('globalSearchBtn').onclick=globalSearchModal;$('shortcutsBtn').onclick=settingsModal;$('statusBtn').onclick=statusMenu;$('settingsBtn').onclick=settingsModal;$('myProfileBtn').onclick=()=>openProfile(me.uid,$('myProfileBtn'));$('newDmBtn').onclick=()=>friendAddModal();
  $('serverHeadMenu').onclick=e=>{e.stopPropagation();if(currentServer)showContext(e.clientX,e.clientY,serverContextItems(currentServer.id))};$('serverMoreBtn').onclick=e=>{if(currentServer)showContext(e.clientX,e.clientY,serverContextItems(currentServer.id))};$('addCategoryBtn').onclick=()=>currentServer&&categoryModal();$('mobileSideBtn').onclick=()=>$('side').classList.toggle('open');
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{const p=b.dataset.page;if(p==='home')renderHome();if(p==='friends')showFriends();if(p==='discover')showDiscover();if(p==='bots')showBots();if(p==='settings')settingsModal()});
  const main=$('mainContent'); if(main&&!main.dataset.motionBound){ main.dataset.motionBound='1'; let timer=0; const ob=new MutationObserver(()=>{cancelAnimationFrame(timer);timer=requestAnimationFrame(()=>{main.classList.remove('view-pulse');void main.offsetWidth;main.classList.add('view-pulse');});}); ob.observe(main,{childList:true,subtree:false}); }
}

(async()=>{try{await setPersistence(auth,browserLocalPersistence)}catch{}initUI();setupShortcuts();onAuthStateChanged(auth,async user=>{if(!user){await goOffline();me=null;cleanRealtime();showAuth(false);return}try{await ensureUser(user,user.displayName||'user');await enterApp()}catch(e){console.error('PrivateCord init error:',e);showAuth(false);setAuthStatus('Nie udało się wczytać konta: '+(e.message||e))}})})();
