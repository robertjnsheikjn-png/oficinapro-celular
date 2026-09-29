const STORE_NAMES=['clients','assets','service_orders','order_items','payments','settings'];
const state={view:'ordens',db:null,records:{},message:''};
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(x||0));
const today=()=>new Date().toISOString().slice(0,10);
const now=()=>new Date().toISOString();
const number=x=>Number(String(x??'').replace(',','.'));
const list=s=>state.records[s]||[];
const byId=(s,id)=>list(s).find(x=>x.id===Number(id));
const name=(s,id)=>byId(s,id)?.name||'—';
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('oficinapro-funilaria',1);r.onupgradeneeded=()=>{for(const name of STORE_NAMES)if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id',autoIncrement:true});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function all(s){return request(state.db.transaction(s).objectStore(s).getAll());}
async function put(s,x){const record={...x};if(record.id===undefined||record.id===null||record.id==='')delete record.id;return request(state.db.transaction(s,'readwrite').objectStore(s).put(record));}
async function remove(s,id){return request(state.db.transaction(s,'readwrite').objectStore(s).delete(Number(id)));}
async function refresh(){for(const s of STORE_NAMES)state.records[s]=await all(s);$('#companyName').textContent='HD Motors — Funilaria e Pintura';render();}
function setting(key){return list('settings').find(x=>x.key===key)?.value||'';}
async function saveSetting(key,value){const old=list('settings').find(x=>x.key===key);await put('settings',{id:old?.id,key,value});}
function msg(text){state.message=text;render();setTimeout(()=>{if(state.message===text){state.message='';render();}},6000);}
function go(view){if(view===state.view)return;state.view=view;sessionStorage.setItem(VIEW_KEY,view);history.pushState({funilaria:true,view},'');render();scrollTo(0,0);}
const nav=[['ordens','Serviços'],['pagas','Ordens pagas'],['financeiro','Financeiro'],['sistema','Sistema']];
function shell(title,content,action=''){return `<div class="top"><h1>${title}</h1>${action}</div>${state.message?`<p class="notice success">${esc(state.message)}</p>`:''}${content}`;}
function empty(label){return `<div class="empty">Nenhum ${label} cadastrado.</div>`;}
function row(title,subtitle,actions){return `<div class="item"><div><b>${esc(title)}</b><small>${esc(subtitle)}</small></div><div class="actions">${actions}</div></div>`;}
function btn(label,act,id='',style='secondary'){return `<button type="button" class="${style}" data-act="${act}" data-id="${id}">${label}</button>`;}

let installPrompt=null;
const appInstalled=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if(authenticated&&state.view==='sistema')render();});
addEventListener('appinstalled',()=>{installPrompt=null;if(authenticated)msg('App instalado com sucesso!');});
async function installApp(){
 if(appInstalled())return msg('O app já está instalado e aberto neste aparelho.');
 if(!installPrompt)return msg('Para instalar: abra este link no Chrome, toque nos três pontos (⋮) e escolha Instalar app ou Adicionar à tela inicial.');
 const prompt=installPrompt;installPrompt=null;
 try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')msg('Instalação solicitada. Confira a tela inicial do aparelho.');}
 catch(error){msg('Abra o menu do Chrome (⋮) e escolha Instalar app ou Adicionar à tela inicial.');}
}
let authenticated=false;
const AUTH_KEY='oficinapro-funilaria-access-v1';
const SESSION_KEY='oficinapro-funilaria-session-v1';
const VIEW_KEY='oficinapro-funilaria-view-v1';
function restoreSession(){
 const saved=credentials();
 authenticated=!!saved&&sessionStorage.getItem(SESSION_KEY)===saved.digest;
 const view=sessionStorage.getItem(VIEW_KEY);
 state.view=authenticated&&nav.some(([id])=>id===view)?view:'ordens';
 document.body.classList.toggle('locked',!authenticated);
}
function startNavigation(){
 // One base entry keeps Android Back inside the app at the initial screen.
 if(!history.state?.funilaria){
  history.replaceState({funilaria:true,base:true},'');
  history.pushState({funilaria:true,view:state.view},'');
 }else{
  history.replaceState({...history.state,funilariaModal:false,view:state.view},'');
  if(history.state.base)history.pushState({funilaria:true,view:state.view},'');
 }
}
function credentials(){return JSON.parse(localStorage.getItem(AUTH_KEY)||'null');}
async function passwordDigest(password,salt){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:210000,hash:'SHA-256'},key,256);
 return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
}
function renderLogin(){
 const setup=!credentials();document.body.classList.add('locked');$('#tabs').innerHTML='';
 $('#app').innerHTML=`<section class="login-panel"><div class="login-brand"><img src="login-logo.svg?v=12" alt="HD Motors — Funilaria e Pintura"><div><b>HD MOTORS</b><small>FUNILARIA E PINTURA</small></div></div><h1>${setup?'Crie seu acesso':'Bem-vindo de volta'}</h1><p class="muted">${setup?'Crie seu acesso neste celular':'Entre para acessar seu painel.'}</p><form id="login-form"><label for="login-user">Login</label><input id="login-user" name="username" autocomplete="username" value="admin" required maxlength="80"><label for="login-password">Senha</label><input id="login-password" name="password" type="password" autocomplete="${setup?'new-password':'current-password'}" required ${setup?'minlength="6"':''}>${setup?'<label for="login-confirm">Confirmar senha</label><input id="login-confirm" name="confirm" type="password" autocomplete="new-password" minlength="6" required>':''}<p id="login-error" class="error notice" role="alert" hidden></p><button class="wide">${setup?'Criar acesso':'Entrar no sistema'}</button></form><p class="muted small">Acesso local deste aparelho. As contas do PC não são sincronizadas. Este bloqueio não criptografa os dados armazenados.</p></section>`;
}
async function handleLogin(form){
 const values=formData(form),button=form.querySelector('button');button.disabled=true;
 try{
  let saved=credentials();
  if(!saved){if(values.password.length<6||values.password!==values.confirm)throw Error('As senhas devem coincidir e ter pelo menos 6 caracteres.');const salt=crypto.randomUUID();saved={username:values.username.trim(),salt,digest:await passwordDigest(values.password,salt)};if(!saved.username)throw Error('Informe o usuário.');localStorage.setItem(AUTH_KEY,JSON.stringify(saved));}
  else if(values.username.trim()!==saved.username||await passwordDigest(values.password,saved.salt)!==saved.digest)throw Error('Usuário ou senha incorretos.');
  sessionStorage.setItem(SESSION_KEY,saved.digest);authenticated=true;document.body.classList.remove('locked');render();
 }catch(error){const box=$('#login-error');box.textContent=error.message;box.hidden=false;}finally{button.disabled=false;}
}

function render(){
 if(!authenticated)return renderLogin();
 $('#tabs').innerHTML=nav.map(([id,label])=>`<button class="${state.view===id?'active':''}" data-view="${id}">${label}</button>`).join('');
 let html='';
 if(state.view==='ordens')html=shell('Serviços e ordens',`<div class="panel">${[...list('service_orders')].reverse().map(x=>row(`OS #${x.id} · ${carName(x)}`,`${x.status} · ${paymentSummary(x).label} · ${money(x.total)} · ${x.complaint||''}`,btn('Abrir','open-order',x.id)+btn('Editar','edit-order',x.id))).join('')||empty('ordem')}</div>`,btn('+ Serviço','new-order','',''));
 if(state.view==='pagas')html=paidOrdersView();
 if(state.view==='financeiro')html=financialView();
 if(state.view==='sistema')html=shell('Sistema',`<div class="panel"><h2>Acesso</h2><p>Usuário: ${esc(credentials()?.username)}</p>${btn('Sair da conta','logout')}${btn('Apagar acesso de teste','reset-access','','danger')}<p class="muted small">Apaga apenas o login e a senha deste aparelho para cadastrar outro acesso. As ordens e pagamentos são mantidos.</p></div><div class="panel"><h2>Dados da oficina</h2><form id="settings-form"><label>Nome</label><input name="company" value="${esc(setting('company'))}"><label>CNPJ / CPF</label><input name="document" value="${esc(setting('document'))}"><label>Telefone</label><input name="phone" value="${esc(setting('phone'))}"><label>Endereço</label><input name="address" value="${esc(setting('address'))}"><button class="wide">Salvar dados</button></form></div><div class="panel"><h2>Cópia de segurança</h2><p class="muted">Os dados ficam neste celular. Exporte uma cópia regularmente, especialmente antes de trocar de aparelho.</p><div class="toolbar">${btn('Baixar backup','export','','')}${btn('Importar backup','import')}</div><input type="file" id="import-file" accept=".json,application/json" hidden></div><div class="panel"><h2>Instalação</h2><div class="toolbar">${btn(appInstalled()?'App já instalado':'Baixar / instalar app','install-app','','')}</div><p>Abra o menu do Chrome e toque em <b>Adicionar à tela inicial</b> ou <b>Instalar app</b>.</p><p class="muted small">Esta versão é independente. Os dados deste aparelho não são sincronizados com o OficinaPro do PC.</p></div>`);
 $('#app').innerHTML=html;
}
function field(label,key,value='',type='text',extra=''){return `<label for="f-${key}">${label}</label><input id="f-${key}" name="${key}" type="${type}" value="${esc(value)}" ${extra}>`;}
function select(label,key,items,value=''){return `<label for="f-${key}">${label}</label><select id="f-${key}" name="${key}">${items.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select>`;}
function options(s,label='name'){return list(s).map(x=>[x.id,x[label]||x.model||'—']);}
function modal(title,body,submit,values={}){const d=$('#modal');$('#modalContent').innerHTML=`<h2>${esc(title)}</h2><form id="entry-form" data-submit="${submit}"><input type="hidden" name="id" value="${esc(values.id||'')}">${body}<div class="dialog-actions"><button type="button" class="secondary" data-act="close">Cancelar</button><button type="submit">Salvar</button></div></form>`;showModal();}
function showModal(){
 const d=$('#modal');if(d.open)return;
 history.pushState({funilaria:true,view:state.view,funilariaModal:true},'');
 d.showModal();
}
function closeModal(){
 const d=$('#modal');if(!d.open)return;d.close();
 if(history.state?.funilariaModal)history.back();
}
addEventListener('popstate',event=>{
 if($('#modal').open)$('#modal').close();
 const current=event.state;
 if(current?.base||!current?.funilaria){
  state.view='ordens';
  history.pushState({funilaria:true,view:state.view},'');
 }else{
  state.view=nav.some(([id])=>id===current.view)?current.view:'ordens';
 }
 sessionStorage.setItem(VIEW_KEY,state.view);
 render();scrollTo(0,0);
});
$('#modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
function formData(form){return Object.fromEntries(new FormData(form).entries());}
function ownerName(o){return o?.owner_name||name('clients',o?.client_id);}
function carName(o){const a=byId('assets',o?.asset_id);return [o?.car_model||[a?.brand,a?.model].filter(Boolean).join(' '),o?.car_plate||a?.plate_serial].filter(Boolean).join(' · ')||'Veículo não informado';}
function textArea(label,key,value='',extra=''){return `<label for="f-${key}">${label}</label><textarea id="f-${key}" name="${key}" ${extra}>${esc(value)}</textarea>`;}
function orderForm(x={}){
 const c=byId('clients',x.client_id),a=byId('assets',x.asset_id);
 modal(x.id?'Editar ordem de serviço':'Novo serviço no carro',
 field('Carro / modelo *','car_model',x.car_model||[a?.brand,a?.model].filter(Boolean).join(' '),'text','required placeholder="Ex.: Fiat Uno 2015, branco"')+
 field('Placa','car_plate',x.car_plate||a?.plate_serial,'text','placeholder="Opcional"')+
 field('Nome do responsável','owner_name',x.owner_name||c?.name,'text','placeholder="Opcional"')+
 field('Telefone','owner_phone',x.owner_phone||c?.phone,'tel','placeholder="Opcional"')+
 textArea('O que deseja fazer no carro? *','complaint',x.complaint,'required placeholder="Ex.: pintar o capô, reparar a porta, banho geral..."')+
 field('Entrada','opened_at',x.opened_at||today(),'date')+field('Prazo de entrega','due_date',x.due_date,'date')+
 select('Situação','status',['Aberta','Em andamento','Aguardando aprovação','Concluída','Cancelada'].map(z=>[z,z]),x.status||'Aberta')+
 `<div class="row"><div>${field('Valor do serviço R$','labor',x.labor||0,'number','min="0" step="0.01"')}</div><div>${field('Desconto R$','discount',x.discount||0,'number','min="0" step="0.01"')}</div></div>`+
 textArea('Observações','notes',x.notes),'order',x);
}

function paymentSummary(o){
 const paid=list('payments').filter(p=>p.order_id===o.id).reduce((sum,p)=>sum+Number(p.amount||0),0);
 const total=Number(o.total||0),balance=Math.max(0,total-paid);
 return {paid,balance,label:o.status==='Cancelada'?'Cancelada':total===0?'Sem valor a cobrar':balance<0.005?'Pago':paid>0?'Parcialmente pago':'Não pago — aguardando pagamento'};
}
function orderMessage(o){
 const p=paymentSummary(o),items=list('order_items').filter(x=>x.order_id===o.id);
 return [setting('company')||'Aleda Gestão — Funilaria','ORDEM DE SERVIÇO #'+o.id,'Responsável: '+ownerName(o),'Veículo: '+carName(o),'Serviço: '+(o.complaint||''),'Situação do serviço: '+o.status,o.due_date?'Prazo de entrega: '+o.due_date:'',...items.map(x=>x.description+' — '+x.quantity+' × '+money(x.unit_price)),'Total: '+money(o.total),'Recebido: '+money(p.paid),'Falta receber: '+money(p.balance),'Pagamento: '+p.label,o.notes?'Observações: '+o.notes:'',setting('phone')?'Contato da oficina: '+setting('phone'):''].filter(Boolean).join('\n');
}
async function shareOrder(id){
 const o=byId('service_orders',id);if(!o)return;
 const text=orderMessage(o);
 if(navigator.share){try{await navigator.share({title:'Ordem de serviço #'+id,text});return;}catch(err){if(err.name==='AbortError')return;}}
 const w=open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');
 // WhatsApp lets the owner choose the recipient and review before sending.
 if(!w)msg('Se o WhatsApp não abrir, permita a abertura de uma nova janela.');
}
function orderDetail(id){const o=byId('service_orders',id);if(!o)return;const items=list('order_items').filter(x=>x.order_id===id),payments=list('payments').filter(x=>x.order_id===id);$('#modalContent').innerHTML=`<h2>OS #${id}</h2><p><b>${esc(carName(o))}</b><br>${esc(ownerName(o))} · ${esc(o.status)}</p><p>${esc(o.complaint||'Sem descrição')}</p><h3>Serviços da ordem</h3>${items.map(x=>row(x.description,`${x.quantity} × ${money(x.unit_price)} = ${money(x.total)}`,btn('Remover','remove-item',x.id,'danger'))).join('')||'<p>Nenhum item.</p>'}<p>Total: <b>${money(o.total)}</b><br>Recebido: ${money(paymentSummary(o).paid)}<br>Falta receber: ${money(paymentSummary(o).balance)}<br><b>${esc(paymentSummary(o).label)}</b></p><div class="toolbar">${btn('Adicionar serviço','add-item',id,'')}${btn('Pagamento','add-payment',id,'')}${btn('Enviar ao cliente','share-order',id,'')}${btn('Imprimir','print-order',id)}${btn('Excluir OS','delete-order',id,'danger')}</div><button class="wide secondary" data-act="close">Fechar</button>`;showModal();}
async function recalc(id){const order=byId('service_orders',id)||await request(state.db.transaction('service_orders').objectStore('service_orders').get(id));if(!order)return;const items=await all('order_items');order.total=Math.max(0,items.filter(x=>x.order_id===id).reduce((n,x)=>n+Number(x.total),0)+Number(order.labor||0)-Number(order.discount||0));await put('service_orders',order);}
async function submit(kind,v){
 const id=Number(v.id)||undefined;
 if(kind==='client'){if(!v.name.trim())throw Error('Informe o nome.');await put('clients',{...byId('clients',id),...v,id,created_at:byId('clients',id)?.created_at||now()});}
 if(kind==='asset'){await put('assets',{...byId('assets',id),...v,id,client_id:Number(v.client_id)});}
 if(kind==='order'){if(!v.car_model.trim()||!v.complaint.trim())throw Error('Informe o carro e o serviço desejado.');if(!Number.isFinite(number(v.labor))||number(v.labor)<0||!Number.isFinite(number(v.discount))||number(v.discount)<0)throw Error('Confira os valores.');const old=byId('service_orders',id);const saved={...old,...v,id,labor:number(v.labor),discount:number(v.discount),total:old?.total||0};const oid=await put('service_orders',saved);await refresh();await recalc(oid);await refresh();return;}
 if(kind==='item'){
 const oid=Number(v.order_id),qty=number(v.quantity),price=number(v.unit_price),description=v.description.trim();
 if(!byId('service_orders',oid)||!description||!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<0)throw Error('Confira a descrição, a quantidade e o valor do serviço.');
 await put('order_items',{order_id:oid,description,quantity:qty,unit_price:price,total:Number((qty*price).toFixed(2))});await recalc(oid);
 }
 if(kind==='payment'){const amount=number(v.amount);if(!Number.isFinite(amount)||amount<=0)throw Error('Informe um valor válido.');await put('payments',{order_id:Number(v.order_id),paid_at:v.paid_at||today(),amount,method:v.method,note:v.note||''});}
 await refresh();
}
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-act=logout]')){sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(VIEW_KEY);authenticated=false;state.view='ordens';if($('#modal').open)closeModal();render();return;}
 if(!authenticated)return;
 if(e.target.closest('[data-act=reset-access]')){if(!confirm('Apagar o acesso deste aparelho e cadastrar o cliente? As ordens e pagamentos serão mantidos.'))return;localStorage.removeItem(AUTH_KEY);authenticated=false;state.view='ordens';closeModal();render();return;}
 const tab=e.target.closest('[data-view]');if(tab){go(tab.dataset.view);return;}
 const el=e.target.closest('[data-act]');if(!el)return;e.preventDefault();const a=el.dataset.act,id=Number(el.dataset.id);try{
  if(a==='install-app')return installApp();
  if(a==='close')return closeModal();
  if(a==='new-order'||a==='edit-order')return orderForm(byId('service_orders',id));
  if(a==='open-order')return orderDetail(id);
  if(a==='share-order')return shareOrder(id);
  if(a==='add-item')return modal('Adicionar serviço',`<input type="hidden" name="order_id" value="${id}">`+field('Descrição do serviço *','description','','text','required')+field('Quantidade','quantity',1,'number','min="0.01" step="0.01" required')+field('Valor unitário R$','unit_price',0,'number','min="0" step="0.01" required'),'item');
  if(a==='add-payment')return modal('Registrar pagamento',`<input type="hidden" name="order_id" value="${id}">`+field('Data','paid_at',today(),'date')+field('Valor R$','amount',0,'number','min="0.01" step="0.01" required')+select('Forma','method',['PIX','Dinheiro','Cartão','Transferência','Outro'].map(x=>[x,x]))+field('Observação','note'),'payment');
  if(a==='delete-payment'){if(confirm('Excluir pagamento?'))await remove('payments',id);}
  if(a==='remove-item'){const item=byId('order_items',id);if(item&&confirm('Remover este serviço da OS?')){await remove('order_items',id);await recalc(item.order_id);await refresh();orderDetail(item.order_id);return;}}
  if(a==='delete-order'){if(confirm('Excluir esta OS, seus serviços e pagamentos?')){const tx=state.db.transaction(['order_items','payments','service_orders'],'readwrite');for(const item of list('order_items').filter(x=>x.order_id===id))tx.objectStore('order_items').delete(item.id);for(const payment of list('payments').filter(x=>x.order_id===id))tx.objectStore('payments').delete(payment.id);tx.objectStore('service_orders').delete(id);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});closeModal();}}
  if(a==='print-order'){const o=byId('service_orders',id),items=list('order_items').filter(x=>x.order_id===id);const w=open('','_blank');if(!w)throw Error('Permita janelas para imprimir.');w.document.write(`<title>OS #${id}</title><meta charset="utf-8"><body style="font:16px Arial;max-width:760px;margin:30px auto"><h1>${esc(setting('company')||'OficinaPro')}</h1><p>${esc(setting('address'))} · ${esc(setting('phone'))}</p><hr><h2>Ordem de serviço #${id}</h2><p>Cliente: ${esc(ownerName(o))}<br>Veículo: ${esc(carName(o))}<br>Situação: ${esc(o.status)}<br>Dano / solicitação: ${esc(o.complaint)}<br>Avaliação: ${esc(o.diagnosis)}<br>Serviço: ${esc(o.service_description)}</p><h3>Serviços</h3>${items.map(x=>`<p>${esc(x.description)} · ${esc(x.quantity)} × ${money(x.unit_price)}</p>`).join('')}<p>Serviço principal: ${money(o.labor)}<br>Desconto: ${money(o.discount)}</p><h2>Total: ${money(o.total)}</h2><script>print()<\/script></body>`);w.document.close();return;}
  if(a==='financial-csv')return exportFinancial();
  if(a==='financial-print')return printFinancial();
  if(a==='export')return exportBackup();
  if(a==='import')return $('#import-file').click();
  await refresh();
 }catch(err){alert(err.message||'Não foi possível concluir.');}
});
document.addEventListener('submit',async e=>{
 const formId=e.target.getAttribute('id');
 if(formId==='financial-filter'){e.preventDefault();const v=formData(e.target);reportPeriod.from=v.from;reportPeriod.until=v.until;render();return;}
 if(formId==='login-form'){e.preventDefault();await handleLogin(e.target);return;}
 if(!authenticated){e.preventDefault();return;}
 if(formId==='settings-form'){e.preventDefault();const v=formData(e.target);for(const [key,value] of Object.entries(v))await saveSetting(key,value);await refresh();return msg('Dados da oficina salvos.');}
 if(formId!=='entry-form')return;e.preventDefault();const form=e.target,kind=form.dataset.submit,button=form.querySelector('button[type=submit]');if(button?.disabled)return;if(button)button.disabled=true;try{await submit(kind,formData(form));closeModal();msg('Salvo com sucesso.');}catch(err){alert(err.message||'Não foi possível salvar.');}finally{if(button)button.disabled=false;}
});
function exportBackup(){const data={format:'OficinaPro-Funilaria',version:1,exported_at:now(),stores:state.records};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='funilaria-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);}
document.addEventListener('change',async e=>{if(!authenticated||e.target.id!=='import-file')return;try{const raw=JSON.parse(await e.target.files[0].text());if(raw.format!=='OficinaPro-Funilaria'||raw.version!==1||!STORE_NAMES.every(s=>Array.isArray(raw.stores[s])))throw Error('Arquivo de backup inválido.');if(!confirm('Substituir TODOS os dados deste celular pelo backup?'))return;const tx=state.db.transaction(STORE_NAMES,'readwrite');for(const s of STORE_NAMES){const st=tx.objectStore(s);st.clear();for(const record of raw.stores[s])st.put(record);}await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});await refresh();msg('Backup importado.');}catch(err){alert(err.message||'Falha ao importar.');}e.target.value='';});

const reportPeriod={from:'',until:''};
function inPeriod(date){return (!reportPeriod.from||date>=reportPeriod.from)&&(!reportPeriod.until||date<=reportPeriod.until);}
function financialData(){
 const orders=list('service_orders').filter(o=>o.status!=='Cancelada');
 const selected=orders.filter(o=>inPeriod(o.opened_at||''));
 const payments=list('payments').filter(p=>inPeriod(p.paid_at||''));
 const paidFor=o=>list('payments').filter(p=>p.order_id===o.id).reduce((n,p)=>n+Number(p.amount||0),0);
 return {orders:selected,payments,total:selected.reduce((n,o)=>n+Number(o.total||0),0),received:payments.reduce((n,p)=>n+Number(p.amount||0),0),balance:selected.reduce((n,o)=>n+Math.max(0,Number(o.total||0)-paidFor(o)),0),paidFor};
}
function paidOrders(){return list('service_orders').filter(o=>paymentSummary(o).label==='Pago');}
function paidOrdersView(){
 const orders=paidOrders();
 return shell('Ordens de serviço pagas',`<p class="muted">Ordens com o valor total recebido. A situação do serviço (aberta ou concluída) é independente do pagamento.</p><div class="cards"><div class="card">Ordens pagas<strong>${orders.length}</strong></div><div class="card">Valor das ordens pagas<strong>${money(orders.reduce((sum,o)=>sum+Number(o.total||0),0))}</strong></div></div><div class="panel">${[...orders].reverse().map(o=>row('OS #'+o.id+' · '+carName(o),'Pago · Serviço: '+o.status+' · Total '+money(o.total)+' · Recebido '+money(paymentSummary(o).paid)+' · '+(o.complaint||''),btn('Abrir','open-order',o.id)+btn('Enviar ao cliente','share-order',o.id))).join('')||empty('ordem paga')}</div>`);
}
function financialView(){
 const r=financialData();
 return shell('Relatórios financeiros',`<div class="panel"><form id="financial-filter"><div class="row"><div>${field('De','from',reportPeriod.from,'date')}</div><div>${field('Até','until',reportPeriod.until,'date')}</div></div><button class="wide">Filtrar período</button></form><p class="muted small">Criar ou concluir uma OS não significa que ela foi paga. Use Abrir → Pagamento para registrar o valor recebido. OS por data de abertura; recebimentos por data de pagamento. Saldo considera todos os pagamentos das OS selecionadas.</p></div><div class="cards"><div class="card">OS no período<strong>${r.orders.length}</strong></div><div class="card">Valor das OS<strong>${money(r.total)}</strong></div><div class="card">Recebimentos no período<strong>${money(r.received)}</strong></div><div class="card">Falta receber<strong>${money(r.balance)}</strong></div></div><div class="toolbar">${btn('Baixar relatório CSV','financial-csv','','')}${btn('Imprimir relatório','financial-print')}</div><div class="panel"><h2>Ordens pagas no período</h2>${r.orders.filter(o=>paymentSummary(o).label==='Pago').map(o=>row('OS #'+o.id+' · '+carName(o),'Pago · Total '+money(o.total)+' · Recebido '+money(paymentSummary(o).paid),btn('Abrir','open-order',o.id)+btn('Enviar ao cliente','share-order',o.id))).join('')||empty('ordem paga no período')}</div><div class="panel"><h2>Ordens e saldos</h2>${r.orders.map(o=>row('OS #'+o.id+' · '+carName(o),o.status+' · '+paymentSummary(o).label+' · Total '+money(o.total)+' · Pago '+money(r.paidFor(o))+' · Saldo '+money(Math.max(0,Number(o.total)-r.paidFor(o))),btn('Abrir','open-order',o.id)+btn('Enviar ao cliente','share-order',o.id))).join('')||empty('ordem no período')}</div><div class="panel"><h2>Pagamentos recebidos</h2>${[...r.payments].reverse().map(x=>row('OS #'+x.order_id+' · '+money(x.amount),x.paid_at+' · '+(x.method||''),btn('Excluir','delete-payment',x.id,'danger'))).join('')||empty('pagamento no período')}</div>`);
}
function exportFinancial(){
 const r=financialData();const cell=x=>'"'+String(x??'').replace(/^[=+@-]/,"'").replace(/"/g,'""')+'"';
 const rows=[['Tipo','OS','Cliente','Data','Situação / pagamento','Valor','Pago','Saldo'],...r.orders.map(o=>['OS',o.id,ownerName(o),o.opened_at,o.status+' / '+paymentSummary(o).label,Number(o.total).toFixed(2),r.paidFor(o).toFixed(2),Math.max(0,Number(o.total)-r.paidFor(o)).toFixed(2)]),...r.payments.map(p=>['Recebimento',p.order_id,ownerName(byId('service_orders',p.order_id)),p.paid_at,p.method,Number(p.amount).toFixed(2),'',''])];
 const blob=new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='funilaria-financeiro-'+today()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}
function printFinancial(){
 const r=financialData(),w=open('','_blank');if(!w)return alert('Permita janelas para imprimir.');
 w.document.write(`<meta charset="utf-8"><title>Relatório financeiro</title><body style="font:16px Arial;padding:24px"><h1>${esc(setting('company')||'HD Motors')}</h1><h2>Relatório financeiro</h2><p>Período: ${esc(reportPeriod.from||'Início')} até ${esc(reportPeriod.until||'Hoje')}</p><p>Valor das OS: ${money(r.total)}<br>Recebido no período: ${money(r.received)}<br>Saldo das OS: ${money(r.balance)}</p>${r.orders.map(o=>`<p>OS #${o.id} · ${esc(ownerName(o))} · ${esc(o.status)} · ${esc(paymentSummary(o).label)}<br>Total: ${money(o.total)} · Pago: ${money(r.paidFor(o))} · Saldo: ${money(Math.max(0,Number(o.total)-r.paidFor(o)))}</p>`).join('')}<script>print()<\/script></body>`);w.document.close();
}

(async()=>{try{restoreSession();startNavigation();state.db=await openDb();await refresh();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}catch(err){$('#app').innerHTML=`<div class="notice error">Não foi possível abrir o banco de dados do aparelho: ${esc(err.message)}</div>`;}})();

