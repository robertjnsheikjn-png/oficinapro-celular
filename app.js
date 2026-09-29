const STORE_NAMES=['clients','assets','products','stock_moves','service_orders','order_items','payments','direct_sales','settings'];
const state={view:'inicio',db:null,records:{},message:''};
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
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('oficinapro-android',1);r.onupgradeneeded=()=>{for(const name of STORE_NAMES)if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id',autoIncrement:true});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function all(s){return request(state.db.transaction(s).objectStore(s).getAll());}
async function put(s,x){return request(state.db.transaction(s,'readwrite').objectStore(s).put(x));}
async function remove(s,id){return request(state.db.transaction(s,'readwrite').objectStore(s).delete(Number(id)));}
async function refresh(){for(const s of STORE_NAMES)state.records[s]=await all(s);$('#companyName').textContent=setting('company')||'Minha Oficina';render();}
function setting(key){return list('settings').find(x=>x.key===key)?.value||'';}
async function saveSetting(key,value){const old=list('settings').find(x=>x.key===key);await put('settings',{id:old?.id,key,value});}
function msg(text){state.message=text;render();setTimeout(()=>{if(state.message===text){state.message='';render();}},6000);}
function go(view){state.view=view;render();scrollTo(0,0);}
const nav=[['inicio','Início'],['clientes','Clientes'],['veiculos','Veículos'],['produtos','Produtos'],['vendas','Vendas'],['ordens','Ordens'],['financeiro','Financeiro'],['sistema','Sistema']];
function shell(title,content,action=''){return `<div class="top"><h1>${title}</h1>${action}</div>${state.message?`<p class="notice success">${esc(state.message)}</p>`:''}${content}`;}
function empty(label){return `<div class="empty">Nenhum ${label} cadastrado.</div>`;}
function row(title,subtitle,actions){return `<div class="item"><div><b>${esc(title)}</b><small>${esc(subtitle)}</small></div><div class="actions">${actions}</div></div>`;}
function btn(label,act,id='',style='secondary'){return `<button class="${style}" data-act="${act}" data-id="${id}">${label}</button>`;}

let authenticated=false;
const AUTH_KEY='oficinapro-access-v1';
function credentials(){return JSON.parse(localStorage.getItem(AUTH_KEY)||'null');}
async function passwordDigest(password,salt){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:210000,hash:'SHA-256'},key,256);
 return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
}
function renderLogin(){
 const setup=!credentials();document.body.classList.add('locked');$('#tabs').innerHTML='';
 $('#app').innerHTML=`<section class="login-panel"><img src="icon.svg" alt="" width="64" height="64"><h1>OficinaPro</h1><p class="muted">${setup?'Crie seu acesso neste celular':'Entre para gerenciar sua oficina'}</p><form id="login-form"><label for="login-user">Usuário</label><input id="login-user" name="username" autocomplete="username" value="admin" required maxlength="80"><label for="login-password">Senha</label><input id="login-password" name="password" type="password" autocomplete="${setup?'new-password':'current-password'}" required ${setup?'minlength="6"':''}>${setup?'<label for="login-confirm">Confirmar senha</label><input id="login-confirm" name="confirm" type="password" autocomplete="new-password" minlength="6" required>':''}<p id="login-error" class="error notice" role="alert" hidden></p><button class="wide">${setup?'Criar acesso':'Entrar'}</button></form><p class="muted small">Acesso local deste aparelho. As contas do PC não são sincronizadas. Este bloqueio não criptografa os dados armazenados.</p></section>`;
}
async function handleLogin(form){
 const values=formData(form),button=form.querySelector('button');button.disabled=true;
 try{
  let saved=credentials();
  if(!saved){if(values.password.length<6||values.password!==values.confirm)throw Error('As senhas devem coincidir e ter pelo menos 6 caracteres.');const salt=crypto.randomUUID();saved={username:values.username.trim(),salt,digest:await passwordDigest(values.password,salt)};if(!saved.username)throw Error('Informe o usuário.');localStorage.setItem(AUTH_KEY,JSON.stringify(saved));}
  else if(values.username.trim()!==saved.username||await passwordDigest(values.password,saved.salt)!==saved.digest)throw Error('Usuário ou senha incorretos.');
  authenticated=true;document.body.classList.remove('locked');render();
 }catch(error){const box=$('#login-error');box.textContent=error.message;box.hidden=false;}finally{button.disabled=false;}
}

function render(){
 if(!authenticated)return renderLogin();
 $('#tabs').innerHTML=nav.map(([id,label])=>`<button class="${state.view===id?'active':''}" data-view="${id}">${label}</button>`).join('');
 let html='';
 if(state.view==='inicio'){
  const sales=list('direct_sales'),orders=list('service_orders'),products=list('products');
  const revenue=sales.reduce((n,x)=>n+Number(x.total||0),0);
  html=shell('Visão geral',`<div class="cards"><div class="card">Vendas<strong>${sales.length}</strong></div><div class="card">Faturamento<strong>${money(revenue)}</strong></div><div class="card">Ordens abertas<strong>${orders.filter(x=>x.status!=='Concluída'&&x.status!=='Cancelada').length}</strong></div><div class="card">Estoque baixo<strong>${products.filter(x=>Number(x.stock)<=Number(x.min_stock)).length}</strong></div></div><div class="panel"><h2>Acesso rápido</h2><div class="toolbar">${btn('Nova venda','new-sale','','')}${btn('Nova ordem','new-order','','')}${btn('Novo cliente','new-client','','')}</div></div>`);
 }
 if(state.view==='clientes')html=shell('Clientes',`<div class="panel">${list('clients').map(x=>row(x.name,[x.phone,x.document].filter(Boolean).join(' · '),btn('Editar','edit-client',x.id)+btn('Excluir','delete-client',x.id,'danger'))).join('')||empty('cliente')}</div>`,btn('+ Cliente','new-client','',''));
 if(state.view==='veiculos')html=shell('Veículos',`<div class="panel">${list('assets').map(x=>row(`${x.brand||''} ${x.model||''}`,`${name('clients',x.client_id)} · ${x.plate_serial||'Sem placa'}`,btn('Editar','edit-asset',x.id)+btn('Excluir','delete-asset',x.id,'danger'))).join('')||empty('veículo')}</div>`,btn('+ Veículo','new-asset','',''));
 if(state.view==='produtos')html=shell('Produtos e estoque',`<div class="panel">${list('products').map(x=>row(x.name,`${money(x.price)} · ${x.stock} em estoque ${x.code?'· '+x.code:''}`,btn('Vender','sell',x.id)+btn('Entrada','stock-in',x.id)+btn('Saída','stock-out',x.id)+btn('Editar','edit-product',x.id))).join('')||empty('produto')}</div>`,btn('+ Produto','new-product','',''));
 if(state.view==='vendas')html=shell('Vendas',`<div class="panel">${[...list('direct_sales')].reverse().map(x=>row(`${name('products',x.product_id)} · ${money(x.total)}`,`${x.sold_at} · ${x.quantity} un. · ${x.method||''}`,btn('Estornar','reverse-sale',x.id,'danger'))).join('')||empty('venda')}</div>`,btn('+ Venda','new-sale','',''));
 if(state.view==='ordens')html=shell('Ordens de serviço',`<div class="panel">${[...list('service_orders')].reverse().map(x=>row(`OS #${x.id} · ${name('clients',x.client_id)}`,`${x.status} · ${money(x.total)} · ${x.opened_at||''}`,btn('Abrir','open-order',x.id)+btn('Editar','edit-order',x.id))).join('')||empty('ordem')}</div>`,btn('+ Ordem','new-order','',''));
 if(state.view==='financeiro'){
  const sales=list('direct_sales').reduce((n,x)=>n+Number(x.total||0),0);
  const paid=list('payments').reduce((n,x)=>n+Number(x.amount||0),0);
  const orders=list('service_orders').filter(x=>x.status!=='Cancelada').reduce((n,x)=>n+Number(x.total||0),0);
  html=shell('Financeiro',`<div class="cards"><div class="card">Vendas diretas<strong>${money(sales)}</strong></div><div class="card">Pagamentos OS<strong>${money(paid)}</strong></div><div class="card">Total em OS<strong>${money(orders)}</strong></div><div class="card">A receber OS<strong>${money(Math.max(0,orders-paid))}</strong></div></div><div class="panel"><h2>Pagamentos recebidos</h2>${[...list('payments')].reverse().map(x=>row(`OS #${x.order_id} · ${money(x.amount)}`,`${x.paid_at} · ${x.method||''}`,btn('Excluir','delete-payment',x.id,'danger'))).join('')||empty('pagamento')}</div>`);
 }
 if(state.view==='sistema')html=shell('Sistema',`<div class="panel"><h2>Acesso</h2><p>Usuário: ${esc(credentials()?.username)}</p>${btn('Sair da conta','logout')}</div><div class="panel"><h2>Dados da oficina</h2><form id="settings-form"><label>Nome</label><input name="company" value="${esc(setting('company'))}"><label>CNPJ / CPF</label><input name="document" value="${esc(setting('document'))}"><label>Telefone</label><input name="phone" value="${esc(setting('phone'))}"><label>Endereço</label><input name="address" value="${esc(setting('address'))}"><button class="wide">Salvar dados</button></form></div><div class="panel"><h2>Cópia de segurança</h2><p class="muted">Os dados ficam neste celular. Exporte uma cópia regularmente, especialmente antes de trocar de aparelho.</p><div class="toolbar">${btn('Baixar backup','export','','')}${btn('Importar backup','import')}</div><input type="file" id="import-file" accept=".json,application/json" hidden></div><div class="panel"><h2>Instalação</h2><p>Abra o menu do Chrome e toque em <b>Adicionar à tela inicial</b> ou <b>Instalar app</b>.</p><p class="muted small">Esta versão é independente. Os dados deste aparelho não são sincronizados com o OficinaPro do PC.</p></div>`);
 $('#app').innerHTML=html;
}
function field(label,key,value='',type='text',extra=''){return `<label for="f-${key}">${label}</label><input id="f-${key}" name="${key}" type="${type}" value="${esc(value)}" ${extra}>`;}
function select(label,key,items,value=''){return `<label for="f-${key}">${label}</label><select id="f-${key}" name="${key}">${items.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select>`;}
function options(s,label='name'){return list(s).map(x=>[x.id,x[label]||x.model||'—']);}
function modal(title,body,submit,values={}){const d=$('#modal');$('#modalContent').innerHTML=`<h2>${esc(title)}</h2><form id="entry-form" data-submit="${submit}"><input type="hidden" name="id" value="${esc(values.id||'')}">${body}<div class="dialog-actions"><button type="button" class="secondary" data-act="close">Cancelar</button><button type="submit">Salvar</button></div></form>`;d.showModal();}
function formData(form){return Object.fromEntries(new FormData(form).entries());}
function clientForm(x={}){modal(x.id?'Editar cliente':'Novo cliente',field('Nome *','name',x.name,'text','required')+field('Telefone','phone',x.phone)+field('CPF / CNPJ','document',x.document)+field('E-mail','email',x.email,'email')+field('Endereço','address',x.address),'client',x);}
function assetForm(x={}){if(!list('clients').length)return alert('Cadastre um cliente primeiro.');modal(x.id?'Editar veículo':'Novo veículo',select('Cliente','client_id',options('clients'),x.client_id)+field('Tipo','kind',x.kind||'Veículo')+field('Marca','brand',x.brand)+field('Modelo *','model',x.model,'text','required')+field('Placa / série','plate_serial',x.plate_serial)+field('Ano','year',x.year)+field('Observações','notes',x.notes),'asset',x);}
function productForm(x={}){modal(x.id?'Editar produto':'Novo produto',field('Nome *','name',x.name,'text','required')+field('Código','code',x.code)+field('Categoria','category',x.category)+`<div class="row"><div>${field('Custo R$','cost',x.cost||0,'number','min="0" step="0.01"')}</div><div>${field('Venda R$','price',x.price||0,'number','min="0" step="0.01"')}</div></div>`+`<div class="row"><div>${field('Estoque atual','stock',x.stock||0,'number','min="0" step="0.01"')}</div><div>${field('Estoque mínimo','min_stock',x.min_stock||0,'number','min="0" step="0.01"')}</div></div>`,'product',x);}
function saleForm(id){if(!list('products').length)return alert('Cadastre um produto primeiro.');const p=byId('products',id)||list('products')[0];modal('Venda direta',select('Produto','product_id',options('products'),p.id)+`<div class="row"><div>${field('Quantidade','quantity',1,'number','min="0.01" step="0.01" required')}</div><div>${field('Preço unitário R$','unit_price',p.price||0,'number','min="0" step="0.01" required')}</div></div>`+select('Pagamento','method',['PIX','Dinheiro','Cartão','Transferência','Outro'].map(x=>[x,x]))+field('Observação','note'),'sale');}
function orderForm(x={}){if(!list('clients').length)return alert('Cadastre um cliente primeiro.');modal(x.id?'Editar OS':'Nova OS',select('Cliente','client_id',options('clients'),x.client_id)+select('Veículo','asset_id',[['','Sem veículo'],...options('assets','model')],x.asset_id)+field('Abertura','opened_at',x.opened_at||today(),'date')+field('Prazo','due_date',x.due_date,'date')+select('Situação','status',['Aberta','Em andamento','Aguardando peças','Concluída','Cancelada'].map(z=>[z,z]),x.status||'Aberta')+field('Defeito relatado','complaint',x.complaint)+field('Diagnóstico','diagnosis',x.diagnosis)+field('Serviço realizado','service_description',x.service_description)+`<div class="row"><div>${field('Mão de obra R$','labor',x.labor||0,'number','min="0" step="0.01"')}</div><div>${field('Desconto R$','discount',x.discount||0,'number','min="0" step="0.01"')}</div></div>`+field('Observações','notes',x.notes),'order',x);}
function stockForm(id,type){const p=byId('products',id);modal(type+' de estoque',`<p>${esc(p.name)} · atual: ${esc(p.stock)}</p><input type="hidden" name="product_id" value="${id}"><input type="hidden" name="move_type" value="${type}">`+field('Quantidade','quantity',1,'number','min="0.01" step="0.01" required')+field('Motivo','note'),'stock');}
function orderDetail(id){const o=byId('service_orders',id);if(!o)return;const items=list('order_items').filter(x=>x.order_id===id),payments=list('payments').filter(x=>x.order_id===id);$('#modalContent').innerHTML=`<h2>OS #${id}</h2><p><b>${esc(name('clients',o.client_id))}</b> · ${esc(o.status)}</p><p>${esc(o.complaint||'Sem descrição')}</p><h3>Peças e serviços</h3>${items.map(x=>row(x.description,`${x.quantity} × ${money(x.unit_price)} = ${money(x.total)}`,btn('Remover','remove-item',x.id,'danger'))).join('')||'<p>Nenhum item.</p>'}<p>Total: <b>${money(o.total)}</b><br>Pago: ${money(payments.reduce((n,x)=>n+Number(x.amount),0))}</p><div class="toolbar">${btn('Adicionar peça','add-item',id,'')}${btn('Pagamento','add-payment',id,'')}${btn('Imprimir','print-order',id)}${btn('Excluir OS','delete-order',id,'danger')}</div><button class="wide secondary" data-act="close">Fechar</button>`;$('#modal').showModal();}
async function recalc(id){const order=byId('service_orders',id)||await request(state.db.transaction('service_orders').objectStore('service_orders').get(id));if(!order)return;const items=await all('order_items');order.total=Math.max(0,items.filter(x=>x.order_id===id).reduce((n,x)=>n+Number(x.total),0)+Number(order.labor||0)-Number(order.discount||0));await put('service_orders',order);}
async function submit(kind,v){
 const id=Number(v.id)||undefined;
 if(kind==='client'){if(!v.name.trim())throw Error('Informe o nome.');await put('clients',{...byId('clients',id),...v,id,created_at:byId('clients',id)?.created_at||now()});}
 if(kind==='asset'){await put('assets',{...byId('assets',id),...v,id,client_id:Number(v.client_id)});}
 if(kind==='product'){const code=v.code.trim();if(code&&list('products').some(x=>x.code===code&&x.id!==id))throw Error('Código já cadastrado.');await put('products',{...byId('products',id),...v,id,code,cost:number(v.cost),price:number(v.price),stock:number(v.stock),min_stock:number(v.min_stock)});}
 if(kind==='order'){const old=byId('service_orders',id);const saved={...old,...v,id,client_id:Number(v.client_id),asset_id:v.asset_id?Number(v.asset_id):null,labor:number(v.labor),discount:number(v.discount),total:old?.total||0};const oid=await put('service_orders',saved);await refresh();await recalc(oid);await refresh();return;}
 if(kind==='sale'){
  const qty=number(v.quantity),price=number(v.unit_price),pid=Number(v.product_id);
  if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<0)throw Error('Quantidade ou preço inválido.');
  const tx=state.db.transaction(['products','direct_sales','stock_moves'],'readwrite');
  const ps=tx.objectStore('products'),p=await request(ps.get(pid));
  if(!p||number(p.stock)<qty){tx.abort();throw Error('Estoque insuficiente.');}
  p.stock=Number((number(p.stock)-qty).toFixed(2));ps.put(p);
  tx.objectStore('direct_sales').add({product_id:pid,sold_at:today(),quantity:qty,unit_price:price,total:Number((qty*price).toFixed(2)),method:v.method,note:v.note||''});
  tx.objectStore('stock_moves').add({product_id:pid,move_type:'Saída',quantity:qty,note:'Venda direta · '+v.method,created_at:now()});
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Venda cancelada.'));});
 }
 if(kind==='stock'){const qty=number(v.quantity),pid=Number(v.product_id),p=byId('products',pid);if(!p||qty<=0||!Number.isFinite(qty))throw Error('Quantidade inválida.');const next=number(p.stock)+(v.move_type==='Entrada'?qty:-qty);if(next<0)throw Error('Estoque insuficiente.');const tx=state.db.transaction(['products','stock_moves'],'readwrite');tx.objectStore('products').put({...p,stock:Number(next.toFixed(2))});tx.objectStore('stock_moves').add({product_id:pid,move_type:v.move_type,quantity:qty,note:v.note||'',created_at:now()});await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
 if(kind==='item'){const oid=Number(v.order_id),qty=number(v.quantity),price=number(v.unit_price),p=byId('products',v.product_id);if(!p||qty<=0||qty>number(p.stock)||price<0)throw Error('Confira o produto, a quantidade e o estoque.');const tx=state.db.transaction(['products','order_items','stock_moves'],'readwrite');tx.objectStore('products').put({...p,stock:Number((number(p.stock)-qty).toFixed(2))});tx.objectStore('order_items').add({order_id:oid,product_id:p.id,description:p.name,quantity:qty,unit_price:price,total:Number((qty*price).toFixed(2))});tx.objectStore('stock_moves').add({product_id:p.id,move_type:'Saída',quantity:qty,note:'OS #'+oid,created_at:now()});await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});await recalc(oid);}
 if(kind==='payment'){const amount=number(v.amount);if(!Number.isFinite(amount)||amount<=0)throw Error('Informe um valor válido.');await put('payments',{order_id:Number(v.order_id),paid_at:v.paid_at||today(),amount,method:v.method,note:v.note||''});}
 await refresh();
}
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-act=logout]')){authenticated=false;state.view='inicio';if($('#modal').open)$('#modal').close();render();return;}
 if(!authenticated)return;
 const tab=e.target.closest('[data-view]');if(tab){go(tab.dataset.view);return;}
 const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,id=Number(el.dataset.id);try{
  if(a==='close')return $('#modal').close();
  if(a==='new-client'||a==='edit-client')return clientForm(byId('clients',id));
  if(a==='new-asset'||a==='edit-asset')return assetForm(byId('assets',id));
  if(a==='new-product'||a==='edit-product')return productForm(byId('products',id));
  if(a==='new-sale'||a==='sell')return saleForm(id);
  if(a==='new-order'||a==='edit-order')return orderForm(byId('service_orders',id));
  if(a==='stock-in'||a==='stock-out')return stockForm(id,a==='stock-in'?'Entrada':'Saída');
  if(a==='open-order')return orderDetail(id);
  if(a==='add-item'){if(!list('products').length)return alert('Cadastre um produto primeiro.');const p=list('products')[0];return modal('Adicionar peça à OS',`<input type="hidden" name="order_id" value="${id}">`+select('Produto','product_id',options('products'),p.id)+field('Quantidade','quantity',1,'number','min="0.01" step="0.01" required')+field('Preço unitário R$','unit_price',p.price||0,'number','min="0" step="0.01" required'),'item');}
  if(a==='add-payment')return modal('Registrar pagamento',`<input type="hidden" name="order_id" value="${id}">`+field('Data','paid_at',today(),'date')+field('Valor R$','amount',0,'number','min="0.01" step="0.01" required')+select('Forma','method',['PIX','Dinheiro','Cartão','Transferência','Outro'].map(x=>[x,x]))+field('Observação','note'),'payment');
  if(a==='delete-client'){if(list('assets').some(x=>x.client_id===id)||list('service_orders').some(x=>x.client_id===id))throw Error('Cliente vinculado a veículo ou OS.');if(confirm('Excluir cliente?'))await remove('clients',id);}
  if(a==='delete-asset'){if(list('service_orders').some(x=>x.asset_id===id))throw Error('Veículo vinculado a OS.');if(confirm('Excluir veículo?'))await remove('assets',id);}
  if(a==='reverse-sale'){const sale=byId('direct_sales',id);if(sale&&confirm('Estornar venda e devolver ao estoque?')){const p=byId('products',sale.product_id),tx=state.db.transaction(['products','direct_sales','stock_moves'],'readwrite');tx.objectStore('products').put({...p,stock:number(p.stock)+number(sale.quantity)});tx.objectStore('direct_sales').delete(id);tx.objectStore('stock_moves').add({product_id:p.id,move_type:'Entrada',quantity:sale.quantity,note:'Estorno venda #'+id,created_at:now()});await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}}
  if(a==='delete-payment'){if(confirm('Excluir pagamento?'))await remove('payments',id);}
  if(a==='remove-item'){const item=byId('order_items',id);if(item&&confirm('Remover item e devolver ao estoque?')){const product=byId('products',item.product_id);const stores=product?['products','order_items','stock_moves']:['order_items'];const tx=state.db.transaction(stores,'readwrite');if(product){tx.objectStore('products').put({...product,stock:number(product.stock)+number(item.quantity)});tx.objectStore('stock_moves').add({product_id:product.id,move_type:'Entrada',quantity:item.quantity,note:'Remoção da OS #'+item.order_id,created_at:now()});}tx.objectStore('order_items').delete(id);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});await refresh();await recalc(item.order_id);await refresh();$('#modal').close();orderDetail(item.order_id);return;}}
  if(a==='delete-order'){if(confirm('Excluir esta OS e devolver as peças ao estoque?')){const items=list('order_items').filter(x=>x.order_id===id),payments=list('payments').filter(x=>x.order_id===id);const tx=state.db.transaction(['products','order_items','payments','service_orders','stock_moves'],'readwrite');for(const item of items){const p=byId('products',item.product_id);if(p){tx.objectStore('products').put({...p,stock:number(p.stock)+number(item.quantity)});tx.objectStore('stock_moves').add({product_id:p.id,move_type:'Entrada',quantity:item.quantity,note:'Exclusão da OS #'+id,created_at:now()});}tx.objectStore('order_items').delete(item.id);}for(const payment of payments)tx.objectStore('payments').delete(payment.id);tx.objectStore('service_orders').delete(id);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});$('#modal').close();}}
  if(a==='print-order'){const o=byId('service_orders',id),items=list('order_items').filter(x=>x.order_id===id);const w=open('','_blank');if(!w)throw Error('Permita janelas para imprimir.');w.document.write(`<title>OS #${id}</title><meta charset="utf-8"><body style="font:16px Arial;max-width:760px;margin:30px auto"><h1>${esc(setting('company')||'OficinaPro')}</h1><p>${esc(setting('address'))} · ${esc(setting('phone'))}</p><hr><h2>Ordem de serviço #${id}</h2><p>Cliente: ${esc(name('clients',o.client_id))}<br>Veículo: ${esc(byId('assets',o.asset_id)?.model||'—')}<br>Situação: ${esc(o.status)}<br>Defeito: ${esc(o.complaint)}<br>Diagnóstico: ${esc(o.diagnosis)}<br>Serviço: ${esc(o.service_description)}</p><h3>Peças</h3>${items.map(x=>`<p>${esc(x.description)} · ${esc(x.quantity)} × ${money(x.unit_price)}</p>`).join('')}<p>Mão de obra: ${money(o.labor)}<br>Desconto: ${money(o.discount)}</p><h2>Total: ${money(o.total)}</h2><script>print()<\/script></body>`);w.document.close();return;}
  if(a==='export')return exportBackup();
  if(a==='import')return $('#import-file').click();
  await refresh();
 }catch(err){alert(err.message||'Não foi possível concluir.');}
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='login-form'){e.preventDefault();await handleLogin(e.target);return;}
 if(!authenticated){e.preventDefault();return;}
 if(e.target.id==='settings-form'){e.preventDefault();const v=formData(e.target);for(const [key,value] of Object.entries(v))await saveSetting(key,value);await refresh();return msg('Dados da oficina salvos.');}
 if(e.target.id!=='entry-form')return;e.preventDefault();const form=e.target,kind=form.dataset.submit;try{await submit(kind,formData(form));$('#modal').close();msg('Salvo com sucesso.');}catch(err){alert(err.message||'Não foi possível salvar.');}
});
function exportBackup(){const data={format:'OficinaPro-Android',version:1,exported_at:now(),stores:state.records};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='oficinapro-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);}
document.addEventListener('change',async e=>{if(!authenticated||e.target.id!=='import-file')return;try{const raw=JSON.parse(await e.target.files[0].text());if(raw.format!=='OficinaPro-Android'||raw.version!==1||!STORE_NAMES.every(s=>Array.isArray(raw.stores[s])))throw Error('Arquivo de backup inválido.');if(!confirm('Substituir TODOS os dados deste celular pelo backup?'))return;const tx=state.db.transaction(STORE_NAMES,'readwrite');for(const s of STORE_NAMES){const st=tx.objectStore(s);st.clear();for(const record of raw.stores[s])st.put(record);}await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});await refresh();msg('Backup importado.');}catch(err){alert(err.message||'Falha ao importar.');}e.target.value='';});
(async()=>{try{state.db=await openDb();await refresh();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}catch(err){$('#app').innerHTML=`<div class="notice error">Não foi possível abrir o banco de dados do aparelho: ${esc(err.message)}</div>`;}})();
