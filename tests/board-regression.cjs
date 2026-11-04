'use strict';
// Exercise user-visible board behavior against an isolated DOM and SDK double.
// No network, real accounts, database writes, email, or browser automation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','board.js'),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function settle(){for(let i=0;i<5;i++)await tick();}
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};}
const member={id:'member-001',email:'member@example.test'};
function post(id,author_id=member.id,title='A member question'){
 return{id,author_id,title,content:'Plain text discussion',category:'board',status:'published',is_pinned:false,created_at:'2026-11-04T01:00:00Z',updated_at:'2026-11-04T01:00:00Z',profiles:{full_name:'Member'}};
}
function harness(options={}){
 const ids=new Map(),listeners=new Map();
 let currentUser=options.guest?null:{...member};
 let currentProfile=currentUser?{id:member.id,role:options.role||'member',full_name:'Member'}:null;
 const rows=options.rows||[post('own'),post('other','member-002','Another member question')];
 const reads=[...(options.reads||[])],mutations=[...(options.mutations||[])];
 const captures={reads:[],writes:[],logins:0};
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes={};this.dataset={};this.className='';this._text='';this.value='';this.disabled=false;this.hidden=false;this.open=false;this.isConnected=true;this.classList={toggle:(name,on)=>{const list=new Set(this.className.split(/\s+/).filter(Boolean));on?list.add(name):list.delete(name);this.className=[...list].join(' ');},contains:name=>this.className.split(/\s+/).includes(name)};}
  set id(value){this._id=value;ids.set(value,this);}get id(){return this._id;}
  set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){const detach=node=>{node.isConnected=false;node.children.forEach(detach);};this.children.forEach(detach);this.children=[];this._text='';this.append(...nodes);}
  setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
  addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);}
  fire(type){if(this.disabled)return;const event={target:this,preventDefault(){},clientX:1,clientY:1};for(const fn of this.listeners[type]||[])fn(event);}
  matches(selector){if(selector.startsWith('.'))return this.className.split(/\s+/).includes(selector.slice(1));return this.tagName===selector.toUpperCase();}
  querySelectorAll(selector){const selectors=selector.split(',').map(s=>s.trim()),found=[];const walk=node=>{for(const child of node.children){if(selectors.some(s=>child.matches(s)))found.push(child);walk(child);}};walk(this);return found;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  focus(){document.activeElement=this;}showModal(){this.open=true;}close(){this.open=false;this.fire('close');}
  getBoundingClientRect(){return{left:0,right:500,top:0,bottom:500};}
  reportValidity(){return this.querySelectorAll('input,textarea').every(node=>!node.required||node.value.trim());}
 }
 const document={body:new Element('body'),activeElement:null,createElement:tag=>new Element(tag),getElementById:id=>ids.get(id)||null};
 const tags={'board-login':'button','board-create':'button','board-search-form':'form','board-search':'input','board-search-reset':'button','board-refresh':'button','board-prev':'button','board-next':'button'};
 for(const id of ['board-gate','board-gate-message','board-members','board-create','board-login','board-search-form','board-search','board-search-reset','board-result-count','board-refresh','board-status','board-list','board-prev','board-next','board-page-label']){const node=new Element(tags[id]||'div');node.id=id;document.body.append(node);}
 const client={from(table){assert.equal(table,'posts');const request={table,operation:'select',filters:[]};return{
  select(columns,settings){request.columns=columns;request.settings=settings;return this;},order(){return this;},
  eq(key,value){request.filters.push([key,value]);return this;},ilike(key,value){request.search=[key,value];return this;},
  insert(payload){request.operation='insert';request.payload=copy(payload);return this;},
  update(payload){request.operation='update';request.payload=copy(payload);return this;},delete(){request.operation='delete';return this;},
  range(first,last){request.range=[first,last];captures.reads.push(copy(request));return reads.length?reads.shift():Promise.resolve({data:copy(rows),error:null,count:rows.length});},
  maybeSingle(){captures.writes.push(copy(request));return mutations.length?mutations.shift():Promise.resolve({data:{id:'saved-id'},error:null});}
 };}};
 const window={dashboardAuth:{getUser:()=>currentUser,getProfile:()=>currentProfile,getClient:()=>client,isReady:()=>options.ready!==false,openLogin(){captures.logins++;}},addEventListener(type,fn){const entries=listeners.get(type)||[];entries.push(fn);listeners.set(type,entries);}};
 const location={hash:'#board'};window.location=location;
 vm.runInContext(code,vm.createContext({window,document,location,console,Intl,Date,setTimeout,clearTimeout}),{filename:'board.js'});
 const visibleButtons=()=>document.body.querySelectorAll('button').filter(b=>b.isConnected);
 return{ids,document,captures,emit(nextUser,nextProfile){currentUser=nextUser;currentProfile=nextProfile||(nextUser?{id:nextUser.id,role:'member'}:null);for(const fn of listeners.get('dashboard-auth-change')||[])fn();},clickId(id){const node=ids.get(id);assert.ok(node,id);assert.equal(node.disabled,false,id+' enabled');node.fire('click');},click(label){const node=visibleButtons().find(b=>b.textContent===label);assert.ok(node,'Button present: '+label);assert.equal(node.disabled,false,label+' enabled');node.fire('click');},hasButton(label){return visibleButtons().some(b=>b.textContent===label);},openPost(index){const rows=ids.get('board-list').querySelectorAll('.board-row-title');assert.ok(rows[index]);rows[index].fire('click');},edit(title,content){ids.get('board-editor-title').value=title;ids.get('board-editor-content').value=content;ids.get('board-dialog').querySelector('form').fire('submit');},listText(){return ids.get('board-list').textContent;},modalText(){return ids.get('board-dialog').textContent;}};
}
(async()=>{
 const guest=harness({guest:true,ready:false});await settle();assert.equal(guest.captures.reads.length,0);assert.equal(guest.ids.get('board-members').hidden,true);assert.equal(guest.ids.get('board-create').hidden,true);guest.clickId('board-login');assert.equal(guest.captures.logins,1);
 const permissions=harness();await settle();permissions.openPost(1);assert.equal(permissions.hasButton('수정'),false);assert.equal(permissions.hasButton('삭제'),false);permissions.ids.get('board-dialog').close();permissions.openPost(0);assert.equal(permissions.hasButton('수정'),true);assert.equal(permissions.hasButton('삭제'),true);permissions.emit(null);assert.equal(permissions.ids.get('board-dialog').open,false);assert.equal(permissions.listText(),'');assert.equal(permissions.modalText(),'MEMBER BOARD×','Logout clears private dialog body synchronously');
 const admin=harness({role:'admin'});await settle();admin.openPost(1);assert.equal(admin.hasButton('수정'),true);assert.equal(admin.hasButton('삭제'),true);
 console.log('PASS guest gate + owner/admin actions + immediate logout cleanup');

 const oldRead=deferred();const stale=harness({reads:[oldRead.promise],rows:[post('new','member-001','Fresh session post')]});stale.emit(null);stale.emit({...member});await settle();assert.match(stale.listText(),/Fresh session post/);oldRead.resolve({data:[post('stale',member.id,'Old private session post')],count:1,error:null});await settle();assert.match(stale.listText(),/Fresh session post/);assert.doesNotMatch(stale.listText(),/Old private session/);
 console.log('PASS old response rejected after logout and login as the same account');

 const writer=harness();await settle();assert.ok(writer.captures.reads[0].filters.some(([key,value])=>key==='category'&&value==='board'));assert.ok(writer.captures.reads[0].filters.some(([key,value])=>key==='status'&&value==='published'));writer.clickId('board-create');writer.edit(' New title ',' New content ');await settle();const inserted=writer.captures.writes[0];assert.equal(inserted.operation,'insert');assert.deepEqual(inserted.payload,{title:'New title',content:'New content',category:'board',author_id:member.id});assert.equal(writer.ids.get('board-dialog').open,false);writer.openPost(0);writer.click('수정');writer.edit('Updated title','Updated content');await settle();const updated=writer.captures.writes[1];assert.equal(updated.operation,'update');assert.deepEqual(updated.payload,{title:'Updated title',content:'Updated content'});assert.ok(updated.filters.some(([key,value])=>key==='id'&&value==='own'));
 console.log('PASS create assigns verified author + update payload excludes privileged fields');

 const failed=harness({mutations:[Promise.resolve({data:null,error:{message:'offline'}})]});await settle();failed.clickId('board-create');failed.edit('Do not lose this title','Keep my draft');await settle();assert.equal(failed.ids.get('board-dialog').open,true);assert.equal(failed.ids.get('board-editor-content').value,'Keep my draft');assert.match(failed.modalText(),/저장하지 못했습니다/);assert.doesNotMatch(failed.ids.get('board-status').textContent,/등록했습니다/);
 const zero=harness({mutations:[Promise.resolve({data:null,error:null})]});await settle();zero.openPost(0);zero.click('삭제');zero.click('게시글 삭제');await settle();assert.equal(zero.ids.get('board-dialog').open,true);assert.match(zero.modalText(),/삭제하지 못했습니다/);assert.doesNotMatch(zero.ids.get('board-status').textContent,/삭제했습니다/);assert.equal(zero.captures.reads.length,1,'Zero-row delete must not claim success or refresh away the failure');
 console.log('PASS failed write preserves draft + zero-row delete never claims success');

 const writeWait=deferred();const canceled=harness({mutations:[writeWait.promise]});await settle();canceled.clickId('board-create');canceled.edit('Old account title','Old account content');canceled.emit(null);writeWait.resolve({data:{id:'late-write'},error:null});await settle();assert.equal(canceled.ids.get('board-dialog').open,false);assert.equal(canceled.listText(),'');assert.doesNotMatch(canceled.ids.get('board-status').textContent,/등록했습니다/);assert.equal(canceled.captures.reads.length,1);
 console.log('PASS late mutation response cannot restore private UI after logout');
 console.log('All board regression checks passed. No real network or database writes were used.');
})().catch(error=>{console.error(error);process.exitCode=1;});
