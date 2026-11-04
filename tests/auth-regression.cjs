'use strict';
// Isolated regression checks: no network, real accounts, messages or browser automation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','auth.js'),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
async function settle(){for(let i=0;i<4;i++)await tick();}
function harness(options={}){
 const ids=new Map();
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes={};this.dataset={};this.className='';this.textContent='';this.value='';this.disabled=false;this.readOnly=false;this.hidden=false;this.open=false;this.isConnected=true;this.validity='';this.classList={toggle:(name,on)=>{const list=new Set(this.className.split(/\s+/).filter(Boolean));on?list.add(name):list.delete(name);this.className=[...list].join(' ');},contains:name=>this.className.split(/\s+/).includes(name)};}
  get firstChild(){return this.children[0]||null;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
  set id(value){this._id=value;ids.set(value,this);}get id(){return this._id;}
  append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
  addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);}
  fire(type){if(this.disabled)return;const event={target:this,preventDefault(){},clientX:1,clientY:1};for(const fn of this.listeners[type]||[])fn(event);}
  matches(selector){if(selector==='button')return this.tagName==='BUTTON';if(selector==='form')return this.tagName==='FORM';if(selector==='input')return this.tagName==='INPUT';if(selector==='input[type="password"]')return this.tagName==='INPUT'&&this.type==='password';if(selector==='input:not([readonly])')return this.tagName==='INPUT'&&!this.readOnly;if(selector.startsWith('.'))return this.className.split(/\s+/).includes(selector.slice(1));return false;}
  querySelectorAll(selector){const selectors=selector.split(',');const found=[];const walk=node=>{for(const child of node.children){if(selectors.some(s=>child.matches(s)))found.push(child);walk(child);}};walk(this);return found;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  focus(){document.activeElement=this;}
  showModal(){this.open=true;}close(){this.open=false;this.fire('close');}
  getBoundingClientRect(){return{left:0,right:500,top:0,bottom:500};}
  setCustomValidity(value){this.validity=value;}reportValidity(){return !this.validity;}
 }
 const document={body:new Element('body'),activeElement:null,createElement:tag=>new Element(tag),getElementById:id=>ids.get(id)||null};
 for(const id of ['account-button','account-sidebar-name','account-sidebar-label','account-sidebar-avatar']){const n=new Element(id==='account-button'?'button':'span');n.id=id;document.body.append(n);}
 const captures={signups:[],updates:[],signins:[],passwordUpdates:[],resets:[],callbacks:[],userReads:0};
 const user={id:'user-001',email:'member@example.test',user_metadata:{full_name:'Old Name',department:'Old Department'}};
 let session=options.signedIn?{user}:null;
 let profile={id:user.id,full_name:'Member Name',department:options.department??'Operations',role:'member'};
 const emit=(event,newSession=session)=>{for(const cb of captures.callbacks)cb(event,newSession);};
 const auth={
  onAuthStateChange(cb){captures.callbacks.push(cb);return{data:{subscription:{unsubscribe(){}}}};},
  async getSession(){return{data:{session},error:null};},
  async getUser(){captures.userReads++;await new Promise(r=>setTimeout(r,5));return{data:{user:options.verificationError?null:session?.user||null},error:options.verificationError?{code:'bad_jwt'}:null};},
  async signInWithPassword(payload){captures.signins.push(payload);session={user};emit('SIGNED_IN');return{data:{session,user},error:null};},
  async signUp(payload){captures.signups.push(payload);return{data:{session:null,user},error:options.signupError?{code:options.signupError}:null};},
  async signOut(){session=null;emit('SIGNED_OUT',null);return{error:null};},
  async resetPasswordForEmail(email,settings){captures.resets.push({email,settings});return{error:null};},
  async updateUser(payload){captures.passwordUpdates.push(payload);return{data:{user},error:null};}
 };
 const client={auth,from(table){assert.equal(table,'profiles');let update=null,filter=null;return{select(columns){assert.equal(columns,'id,full_name,department,role');return this;},eq(key,id){filter={key,id};return this;},update(payload){update=payload;captures.updates.push(payload);return this;},async maybeSingle(){assert.deepEqual(filter,{key:'id',id:user.id});if(update)profile={...profile,...update};return{data:{...profile},error:null};}};}};
 const window={location:{origin:'https://example.test',pathname:'/hd-06/',hash:'',search:''},SUPABASE_CONFIG:{url:'https://project.supabase.co',publishableKey:'sb_publishable_test_only',emailEnabled:options.emailEnabled!==false},supabase:{createClient(url,key,config){assert.equal(config.auth.flowType,'implicit');assert.equal(config.auth.persistSession,true);assert.equal(config.auth.detectSessionInUrl,true);return client;}}};
 const context=vm.createContext({window,document,URL,URLSearchParams,setTimeout,clearTimeout,history:{replaceState(){}},console});
 vm.runInContext(code,context,{filename:'auth.js'});
 const findButton=text=>document.body.querySelectorAll('button').find(b=>b.textContent===text);
 return{ids,document,captures,open(){ids.get('account-button').fire('click');},click(text){const b=findButton(text);assert.ok(b,'Button present: '+text);assert.equal(b.disabled,false,'Button enabled: '+text);b.fire('click');},set(id,value){const input=ids.get(id);assert.ok(input,id);input.value=value;input.fire('input');},submit(){const form=ids.get('auth-dialog').querySelector('form');assert.ok(form,'Current form');form.fire('submit');},title(){return ids.get('auth-title').textContent;},emitRecovery(){session={user};emit('PASSWORD_RECOVERY');},emitSignedIn(){session={user};emit('SIGNED_IN');}};
}
(async()=>{
 const login=harness();await settle();login.open();assert.equal(login.title(),'다시 만나 반가워요.');login.set('auth-email',' member@example.test ');login.set('auth-password','correct-password');login.submit();await settle();assert.equal(login.title(),'내 정보','SIGNED_IN event must not clobber login transition');assert.equal(login.captures.signins[0].email,'member@example.test');assert.equal(login.captures.userReads,1,'Concurrent auth event and form await share verification');
 login.set('auth-profile-name','New Member');login.set('auth-profile-department','');login.submit();await settle();assert.equal(login.captures.updates.length,1);const update=login.captures.updates[0];assert.deepEqual(Object.keys(update).sort(),['department','full_name']);assert.equal(update.department,'');assert.equal(update.full_name,'New Member');login.ids.get('auth-dialog').close();login.open();assert.equal(login.ids.get('auth-profile-department').value,'','Saved empty department must not fall back to stale metadata');
 console.log('PASS login race + profile update allowlist + empty department persistence');
 const existing=harness({signedIn:true,department:''});await settle();existing.open();assert.equal(existing.ids.get('auth-profile-department').value,'');assert.equal(existing.ids.get('auth-new-password'),undefined,'Ordinary login cannot reveal recovery form');existing.emitSignedIn();await settle();assert.equal(existing.ids.get('auth-new-password'),undefined);existing.emitRecovery();await settle();assert.equal(existing.title(),'새 비밀번호를 설정해 주세요.');existing.set('auth-new-password','replacement-password');existing.set('auth-new-confirm','replacement-password');existing.submit();await settle();assert.equal(existing.captures.passwordUpdates.length,1);assert.deepEqual(Object.keys(existing.captures.passwordUpdates[0]),['password']);assert.equal(existing.title(),'내 정보');
 console.log('PASS recovery form event gate + explicit password submission');
 const signup=harness();await settle();signup.open();signup.click('회원가입');signup.set('auth-name','New Person');signup.set('auth-department','Research');signup.set('auth-email','new@example.test');signup.set('auth-password','brand-new-password');signup.set('auth-password-confirm','brand-new-password');signup.submit();await settle();assert.equal(signup.captures.signups.length,1);const signupData=signup.captures.signups[0];assert.deepEqual(Object.keys(signupData.options.data).sort(),['department','full_name']);assert.equal(signupData.options.data.role,undefined);assert.equal(signupData.options.emailRedirectTo,'https://example.test/hd-06/');assert.equal(signup.captures.passwordUpdates.length,0);assert.match(signup.ids.get('auth-status').textContent,/이메일 인증/);signup.click('비밀번호 찾기');assert.equal(signup.title(),'비밀번호를 잊으셨나요?','Tabs remain enabled after async signup');
 console.log('PASS signup metadata allowlist + confirmation + tabs unlocked');
 const failed=harness({verificationError:true});await settle();failed.open();failed.set('auth-email','member@example.test');failed.set('auth-password','correct-password');failed.submit();await settle();assert.equal(failed.title(),'다시 만나 반가워요.');assert.doesNotMatch(failed.ids.get('auth-status').textContent,/로그인되었습니다/);assert.equal(failed.ids.get('account-button').textContent,'로그인');
 const smtp=harness({signupError:'email_address_not_authorized'});await settle();smtp.open();smtp.click('회원가입');smtp.set('auth-name','New Person');smtp.set('auth-email','new@example.test');smtp.set('auth-password','brand-new-password');smtp.set('auth-password-confirm','brand-new-password');smtp.submit();await settle();assert.match(smtp.ids.get('auth-status').textContent,/현재 메일 발송 설정/);assert.doesNotMatch(smtp.ids.get('auth-status').textContent,/메일을 보냈습니다/);
 console.log('PASS failed session verification and SMTP rejection never claim success');
 const noMail=harness({emailEnabled:false});await settle();noMail.open();assert.ok(!noMail.document.body.querySelectorAll('button').some(b=>b.textContent==='비밀번호 찾기'));noMail.click('회원가입');noMail.set('auth-name','New Person');noMail.set('auth-email','new@example.test');noMail.set('auth-password','brand-new-password');noMail.set('auth-password-confirm','brand-new-password');noMail.submit();await settle();assert.match(noMail.ids.get('auth-status').textContent,/서버의 이메일 인증 설정/);assert.doesNotMatch(noMail.ids.get('auth-status').textContent,/회원가입이 완료/);
 const noMailMember=harness({signedIn:true,emailEnabled:false});await settle();noMailMember.open();assert.ok(!noMailMember.document.body.querySelectorAll('button').some(b=>b.textContent==='비밀번호 재설정 메일 받기'));assert.ok(noMailMember.document.body.querySelectorAll('button').some(b=>b.textContent==='로그아웃'));assert.equal(noMailMember.captures.resets.length,0);
 console.log('PASS email-disabled controls and honest pending confirmation');
 console.log('All auth regression checks passed. No real network or email was used.');
})().catch(error=>{console.error(error);process.exitCode=1;});
