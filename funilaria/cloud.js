if(!window.supabase){document.getElementById('app').textContent='Não foi possível carregar a conexão com a nuvem. Verifique a internet e atualize.';}else{

const cloudClient=window.supabase.createClient('https://dlkzhzovyhxocmxvkijh.supabase.co','sb_publishable_zEN5cW-Qj8K1JMN0l301Pw_8rDjFAV4',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let cloudUser=null,cloudRevision=0,cloudSnapshot='',cloudPending=false,cloudBusy=false,cloudConflict=false,cloudMode='login',cloudRecovery=false;
const stableJson=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const pendingKey=()=> 'hdmotors-cloud-pending-'+cloudUser.id;
const emptyStores=()=>Object.fromEntries(STORE_NAMES.map(s=>[s,[]]));
const cleanStores=data=>{if(!data||!STORE_NAMES.every(s=>Array.isArray(data[s])))throw Error('Dados da nuvem inválidos.');return Object.fromEntries(STORE_NAMES.map(s=>[s,data[s]]));};
credentials=()=>cloudUser?{username:cloudUser.email}:null;
openDb=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('hdmotors-cloud-'+cloudUser.id,1);r.onupgradeneeded=()=>{for(const s of STORE_NAMES)r.result.createObjectStore(s,{keyPath:'id',autoIncrement:true});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function replaceStores(data){const tx=state.db.transaction(STORE_NAMES,'readwrite');for(const s of STORE_NAMES){const st=tx.objectStore(s);st.clear();for(const row of data[s])st.put(row);}await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
async function cloudRead(){const {data,error}=await cloudClient.from('hdmotors_accounts').select('data,revision').eq('user_id',cloudUser.id).maybeSingle();if(error)throw error;return data;}
async function loadCloud(){
 const remote=await cloudRead(),data=cleanStores(remote?.data||emptyStores());
 cloudRevision=Number(remote?.revision||0);cloudSnapshot=stableJson(data);
 if(localStorage.getItem(pendingKey())){
  for(const s of STORE_NAMES)state.records[s]=await all(s);
  if(stableJson(state.records)!==cloudSnapshot){cloudPending=true;cloudConflict=true;return;}
 }
 await replaceStores(data);localStorage.removeItem(pendingKey());cloudPending=false;cloudConflict=false;
}
async function saveCloud(){
 if(!cloudUser||!authenticated)return;
 const json=stableJson(state.records);if(json===cloudSnapshot)return;
 localStorage.setItem(pendingKey(),'1');cloudPending=true;
 if(cloudConflict)throw Error('Há alterações de outro aparelho. Baixe as alterações pendentes e carregue os dados da nuvem antes de continuar.');
 const {data,error}=await cloudClient.rpc('hdmotors_save_account',{p_data:state.records,p_revision:cloudRevision});
 if(error){
  try{const remote=await cloudRead();if(remote&&stableJson(cleanStores(remote.data))===json){cloudRevision=Number(remote.revision);cloudSnapshot=json;cloudPending=false;localStorage.removeItem(pendingKey());return;}}catch(e){}
  if(error.message?.includes('revision_conflict'))cloudConflict=true;
  throw Error(cloudConflict?'Outro aparelho alterou os dados. Suas alterações ficaram pendentes neste aparelho. Baixe uma cópia antes de carregar os dados da nuvem.':'Não foi possível salvar na nuvem. As alterações estão pendentes neste aparelho; use Tentar sincronizar.');
 }
 cloudRevision=Number(data);cloudSnapshot=json;cloudPending=false;localStorage.removeItem(pendingKey());
}
const baseRefresh=refresh;
refresh=async()=>{await baseRefresh();await saveCloud();render();};
const baseRender=render;
render=()=>{
 if(cloudRecovery)return renderCloudLogin();
 baseRender();
 if(authenticated){
  const status=document.createElement('div');status.className='notice '+(cloudPending?'error':'success');status.setAttribute('role','status');
  status.innerHTML=cloudPending?'Alterações pendentes — ainda não salvas na nuvem. '+btn('Tentar sincronizar','cloud-sync')+btn('Baixar alterações pendentes','export')+btn('Carregar dados da nuvem','cloud-load'):'Conta na nuvem · '+esc(cloudUser.email)+' · Dados sincronizados';
  $('#app').prepend(status);
  if(state.view==='sistema')$('#app').innerHTML=$('#app').innerHTML.replace('Esta versão é independente. Os dados deste aparelho não são sincronizados com o OficinaPro do PC.','As ordens e pagamentos sincronizados ficam disponíveis ao entrar com esta conta em outro aparelho.').replace('Os dados ficam neste celular. Exporte uma cópia regularmente, especialmente antes de trocar de aparelho.','Os dados são salvos na sua conta na nuvem. Você também pode baixar ou importar um backup.');
 }
};
renderLogin=()=>renderCloudLogin();
function renderCloudLogin(){
 document.body.classList.add('locked');$('#tabs').innerHTML='';
 const signup=cloudMode==='signup';
 $('#app').innerHTML='<section class="login-panel"><div class="login-brand"><img src="login-logo.svg?v=12" alt="HD Motors"><div><b>HD MOTORS</b><small>FUNILARIA E PINTURA</small></div></div><h1>'+ (cloudRecovery?'Criar nova senha':signup?'Criar conta na nuvem':'Entrar na conta')+'</h1><p class="muted">Use a mesma conta em qualquer aparelho para acessar suas ordens e pagamentos.</p><form id="login-form">'+(cloudRecovery?'':'<label for="cloud-email">E-mail</label><input id="cloud-email" name="username" type="email" autocomplete="username" required>')+'<label for="cloud-password">Senha</label><input id="cloud-password" name="password" type="password" autocomplete="'+(signup||cloudRecovery?'new-password':'current-password')+'" required minlength="8">'+(signup||cloudRecovery?'<label>Confirmar senha</label><input name="confirm" type="password" autocomplete="new-password" required minlength="8">':'')+'<p id="login-error" class="error notice" role="alert" hidden></p><button class="wide">'+(cloudRecovery?'Salvar nova senha':signup?'Criar conta':'Entrar')+'</button></form><div class="toolbar">'+(cloudRecovery?'':btn(signup?'Já tenho conta':'Criar conta','cloud-mode')+btn('Esqueci minha senha','cloud-reset'))+'</div><p class="muted small">O acesso antigo era local. Crie uma conta com e-mail para usar a nuvem. Para transferir ordens antigas, importe o backup depois de entrar. É necessário internet para sincronizar.</p></section>';
}
handleLogin=async form=>{
 const v=formData(form),button=form.querySelector('button');button.disabled=true;
 try{
  if(cloudRecovery){if(v.password!==v.confirm)throw Error('As senhas devem coincidir.');const {error}=await cloudClient.auth.updateUser({password:v.password});if(error)throw error;cloudRecovery=false;await enterCloud();return;}
  const email=v.username.trim().toLowerCase();
  if(cloudMode==='signup'){
   if(v.password!==v.confirm)throw Error('As senhas devem coincidir.');
   const {data,error}=await cloudClient.auth.signUp({email,password:v.password,options:{emailRedirectTo:location.origin+location.pathname}});
   if(error)throw error;
   if(!data.session){cloudMode='login';renderCloudLogin();const b=$('#login-error');b.textContent='Confira seu e-mail para confirmar a conta e depois entre. Se o envio estiver bloqueado, o administrador precisa configurar os e-mails do projeto.';b.hidden=false;return;}
  }else{const {error}=await cloudClient.auth.signInWithPassword({email,password:v.password});if(error)throw error;}
  await enterCloud();
 }catch(e){const box=$('#login-error');if(box){box.textContent=e.message==='Invalid login credentials'?'E-mail ou senha incorretos. Use uma conta da nuvem; o login antigo era local.':e.message;box.hidden=false;}else alert(e.message);}
 finally{button.disabled=false;}
};
async function enterCloud(){
 const {data,error}=await cloudClient.auth.getUser();if(error)throw error;
 cloudUser=data.user;if(!cloudUser)throw Error('Entre na sua conta.');
 if(state.db)state.db.close();state.db=await openDb();await loadCloud();authenticated=true;
 const v=sessionStorage.getItem(VIEW_KEY);state.view=nav.some(([id])=>id===v)?v:'ordens';
 document.body.classList.remove('locked');await baseRefresh();render();
}
async function logoutCloud(){
 if(cloudPending){alert('Há alterações pendentes. Sincronize ou baixe um backup antes de sair.');return;}
 const {error}=await cloudClient.auth.signOut();if(error)throw error;
 authenticated=false;cloudUser=null;state.db?.close();state.db=null;state.records={};state.view='ordens';sessionStorage.removeItem(VIEW_KEY);render();
}
document.addEventListener('click',async e=>{
 const action=e.target.closest('[data-act]')?.dataset.act;
 if(!action)return;
 if(['logout','reset-access','cloud-mode','cloud-reset','cloud-sync','cloud-load'].includes(action)){
  e.preventDefault();e.stopImmediatePropagation();
  try{
   if(action==='logout')return await logoutCloud();
   if(action==='reset-access')return alert('O acesso agora pertence à conta na nuvem. Use Sair da conta para entrar com outro cliente.');
   if(action==='cloud-mode'){cloudMode=cloudMode==='login'?'signup':'login';renderCloudLogin();return;}
   if(action==='cloud-reset'){
    const email=$('#cloud-email')?.value.trim();if(!email)return alert('Informe seu e-mail primeiro.');
    const {error}=await cloudClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;
    alert('Se houver uma conta com este e-mail e o envio estiver configurado, você receberá um link para redefinir a senha.');return;
   }
   if(action==='cloud-sync'){cloudBusy=true;for(const s of STORE_NAMES)state.records[s]=await all(s);await saveCloud();render();return;}
   if(action==='cloud-load'){
    cloudBusy=true;
    if(cloudPending&&!confirm('Baixe o backup das alterações pendentes primeiro. Carregar a nuvem vai substituir as alterações locais não sincronizadas. Continuar?'))return;
    const remote=await cloudRead(),data=cleanStores(remote?.data||emptyStores());await replaceStores(data);
    cloudRevision=Number(remote?.revision||0);cloudSnapshot=stableJson(data);localStorage.removeItem(pendingKey());cloudPending=false;cloudConflict=false;await baseRefresh();render();return;
   }
  }catch(err){alert(err.message);}finally{cloudBusy=false;}
 }
},true);
// Prevent overlapping saves and block edits while a conflict needs resolution.
const readActions=new Set(['open-order','new-order','edit-order','add-item','add-payment','close','share-order','print-order','financial-print','financial-csv','export','install-app','cloud-sync','cloud-load','cloud-mode','cloud-reset','logout','reset-access']);
document.addEventListener('click',e=>{
 const action=e.target.closest('[data-act]')?.dataset.act;
 if(cloudBusy||cloudConflict&&action&&!readActions.has(action)){e.preventDefault();e.stopImmediatePropagation();if(!cloudBusy)alert('Resolva as alterações pendentes antes de editar.');}
},true);
document.addEventListener('submit',e=>{
 if(e.target.id==='login-form')return;
 if(cloudBusy||cloudConflict){e.preventDefault();e.stopImmediatePropagation();return;}
},true);
cloudClient.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){cloudRecovery=true;renderCloudLogin();}});
(async()=>{
 try{
  startNavigation();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  const {data,error}=await cloudClient.auth.getSession();if(error)throw error;
  if(data.session)await enterCloud();else renderCloudLogin();
 }catch(e){authenticated=false;renderCloudLogin();const box=$('#login-error');box.textContent='Não foi possível carregar a conta: '+e.message;box.hidden=false;}
})();

}