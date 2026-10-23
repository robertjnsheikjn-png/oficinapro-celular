(() => {
  const $ = s => document.querySelector(s), U = OfficeProUtil;
  const nav = [['home','Visão geral'],['clients','Clientes'],['vehicles','Veículos'],['products','Produtos'],['orders','Ordens de serviço'],['finance','Financeiro'],['settings','Configurações']];
  let user = null, data = OfficeProStore.empty(), view = 'home', authMode = 'login', notice = '';
  const list = key => data[key] || [];
  const client = id => list('clients').find(x => x.id === id);
  const vehicle = id => list('vehicles').find(x => x.id === id);
  const order = id => list('orders').find(x => x.id === id);
  const rows = (head, body) => `<div class="table-wrap"><table class="table"><thead><tr>${head.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${head.length}" class="empty">Nenhum registro cadastrado.</td></tr>`}</tbody></table></div>`;
  const button = (text, action, id='', cls='secondary') => `<button class="${cls}" data-act="${action}" data-id="${U.escape(id)}">${text}</button>`;
  function auth() {
    $('#app').innerHTML = `<section class="auth"><div class="brand">OFICINA<span>PRO</span></div><h1>${authMode==='login'?'Entrar na Gestão':'Criar acesso'}</h1><p class="muted">Use a mesma conta no computador e no app de Funilaria.</p>${notice?`<p class="notice">${U.escape(notice)}</p>`:''}<form id="auth-form"><label>E-mail</label><input type="email" name="email" autocomplete="username" required><label>Senha</label><input type="password" name="password" minlength="8" autocomplete="${authMode==='login'?'current-password':'new-password'}" required><button>${authMode==='login'?'Entrar':'Criar conta'}</button></form><button class="secondary switch" data-act="auth-switch">${authMode==='login'?'Criar uma conta':'Já tenho conta'}</button></section>`;
  }
  function shell(title, content, action='') {
    $('#app').innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand">OFICINA<span>PRO</span><small style="display:block;font-size:12px;font-weight:500;color:#b7cada">Gestão para computador</small></div><nav class="side-nav">${nav.map(([id,label])=>`<button data-view="${id}" class="${view===id?'active':''}">${label}</button>`).join('')}</nav><div class="side-footer">Conta: ${U.escape(user.email)}<br>Sincronizado com Funilaria</div></aside><section class="main"><div class="top"><h1>${title}</h1><div class="toolbar">${action}${button('Sair','logout')}</div></div>${notice?`<p class="notice">${U.escape(notice)}</p>`:''}${content}<p class="status">Dados sincronizados na nuvem · ${U.escape(user.email)}</p></section></div>`;
  }
  function render() {
    if (!user) return auth();
    const totalOrders = list('orders').reduce((n,x)=>n+Number(x.labor||0)+Number(x.parts||0)-Number(x.discount||0),0);
    if (view==='home') return shell('Visão geral', `<div class="cards"><div class="card">Clientes<strong>${list('clients').length}</strong></div><div class="card">Veículos<strong>${list('vehicles').length}</strong></div><div class="card">Ordens em aberto<strong>${list('orders').filter(x=>x.status!=='Concluída'&&x.status!=='Cancelada').length}</strong></div><div class="card">Total das ordens<strong>${U.money(totalOrders)}</strong></div></div><div class="panel"><h2>Acesso rápido</h2><div class="toolbar">${button('Novo cliente','new-client','','')}${button('Nova ordem','new-order','','')}</div></div>`);
    if (view==='clients') return shell('Clientes', rows(['Nome','Telefone','E-mail','Ações'],list('clients').map(x=>`<tr><td>${U.escape(x.name)}</td><td>${U.escape(x.phone||'—')}</td><td>${U.escape(x.email||'—')}</td><td><div class="actions">${button('Editar','edit-client',x.id)}${button('Excluir','delete-client',x.id,'danger')}</div></td></tr>`).join(''),button('+ Cliente','new-client','','')));
    if (view==='vehicles') return shell('Veículos', rows(['Veículo','Cliente','Placa','Ano','Ações'],list('vehicles').map(x=>`<tr><td>${U.escape([x.brand,x.model].filter(Boolean).join(' '))}</td><td>${U.escape(client(x.client_id)?.name||'—')}</td><td>${U.escape(x.plate||'—')}</td><td>${U.escape(x.year||'—')}</td><td><div class="actions">${button('Editar','edit-vehicle',x.id)}${button('Excluir','delete-vehicle',x.id,'danger')}</div></td></tr>`).join(''),button('+ Veículo','new-vehicle','','')));
    if (view==='products') return shell('Produtos', rows(['Produto','Estoque','Preço','Ações'],list('products').map(x=>`<tr><td>${U.escape(x.name)}</td><td>${Number(x.stock||0)}</td><td>${U.money(x.price)}</td><td><div class="actions">${button('Editar','edit-product',x.id)}${button('Excluir','delete-product',x.id,'danger')}</div></td></tr>`).join(''),button('+ Produto','new-product','','')));
    if (view==='orders') return shell('Ordens de serviço', rows(['OS','Cliente','Veículo','Situação','Total','Ações'],[...list('orders')].reverse().map(x=>`<tr><td>#${U.escape(x.number||x.id.slice(0,6))}</td><td>${U.escape(client(x.client_id)?.name||'—')}</td><td>${U.escape(vehicle(x.vehicle_id)?.model||x.vehicle_text||'—')}</td><td>${U.escape(x.status||'Aberta')}</td><td>${U.money(Number(x.labor||0)+Number(x.parts||0)-Number(x.discount||0))}</td><td><div class="actions">${button('Editar','edit-order',x.id)}${button('Pagamento','payment',x.id)}${button('Excluir','delete-order',x.id,'danger')}</div></td></tr>`).join(''),button('+ Ordem','new-order','','')));
    if (view==='finance') {
      const paid=list('payments').reduce((n,x)=>n+Number(x.amount||0),0);
      return shell('Financeiro',`<div class="cards"><div class="card">Valor em ordens<strong>${U.money(totalOrders)}</strong></div><div class="card">Pagamentos recebidos<strong>${U.money(paid)}</strong></div><div class="card">A receber<strong>${U.money(Math.max(0,totalOrders-paid))}</strong></div><div class="card">Pagamentos<strong>${list('payments').length}</strong></div></div><div class="panel"><h2>Pagamentos</h2>${rows(['Data','Cliente','Valor','Forma'],[...list('payments')].reverse().map(p=>`<tr><td>${U.date(p.paid_at)}</td><td>${U.escape(client(order(p.order_id)?.client_id)?.name||'—')}</td><td>${U.money(p.amount)}</td><td>${U.escape(p.method||'—')}</td></tr>`).join(''))}</div>`);
    }
    return shell('Configurações',`<div class="panel"><form id="settings-form"><label>Nome da oficina</label><input name="company" value="${U.escape(data.settings.company||'Minha Oficina')}"><button style="margin-top:14px">Salvar</button></form></div><div class="panel"><h2>Acesso sincronizado</h2><p>Entre com o mesmo e-mail no app de Funilaria para ver os mesmos clientes, veículos e ordens.</p></div>`);
  }
  function field(label,name,value='',type='text',required=false) { return `<label>${label}</label><input name="${name}" type="${type}" value="${U.escape(value)}" ${required?'required':''}>`; }
  function select(label,name,items,value='') { return `<label>${label}</label><select name="${name}">${items.map(([v,t])=>`<option value="${U.escape(v)}" ${v===value?'selected':''}>${U.escape(t)}</option>`).join('')}</select>`; }
  function showForm(title, kind, fields, item={}) { $('#modal-content').innerHTML=`<h2>${title}</h2><form id="entry-form" data-kind="${kind}"><input type="hidden" name="id" value="${U.escape(item.id||'')}">${fields}<div class="dialog-actions"><button type="button" class="secondary" data-act="close">Cancelar</button><button>Salvar</button></div></form>`;$('#modal').showModal(); }
  function formFor(kind,item={}) {
    if(kind==='client') return showForm(item.id?'Editar cliente':'Novo cliente','client',field('Nome *','name',item.name,'text',true)+`<div class="grid2">${field('Telefone','phone',item.phone)}${field('E-mail','email',item.email,'email')}</div>`+field('CPF / CNPJ','document',item.document),item);
    if(kind==='vehicle') return showForm(item.id?'Editar veículo':'Novo veículo','vehicle',select('Cliente','client_id',list('clients').map(x=>[x.id,x.name]),item.client_id)+`<div class="grid2">${field('Marca','brand',item.brand)}${field('Modelo','model',item.model,'text',true)}</div><div class="grid2">${field('Placa','plate',item.plate)}${field('Ano','year',item.year,'number')}</div>`,item);
    if(kind==='product') return showForm(item.id?'Editar produto':'Novo produto','product',field('Nome *','name',item.name,'text',true)+`<div class="grid2">${field('Estoque','stock',item.stock||0,'number')}${field('Preço R$','price',item.price||0,'number')}</div>`,item);
    if(kind==='order') return showForm(item.id?'Editar ordem':'Nova ordem','order',select('Cliente','client_id',list('clients').map(x=>[x.id,x.name]),item.client_id)+select('Veículo','vehicle_id',[['','Sem veículo'],...list('vehicles').filter(v=>!item.client_id||v.client_id===item.client_id).map(v=>[v.id,`${v.brand||''} ${v.model||''} ${v.plate||''}`])],item.vehicle_id)+field('Veículo (descrição)','vehicle_text',item.vehicle_text)+`<div class="grid2">${field('Abertura','opened_at',item.opened_at||new Date().toISOString().slice(0,10),'date')}${select('Situação','status',['Aberta','Em andamento','Aguardando peças','Concluída','Cancelada'].map(x=>[x,x]),item.status||'Aberta')}</div>`+`<label>Problema relatado</label><textarea name="complaint">${U.escape(item.complaint||'')}</textarea><div class="grid2">${field('Mão de obra R$','labor',item.labor||0,'number')}${field('Peças R$','parts',item.parts||0,'number')}</div>`+field('Desconto R$','discount',item.discount||0,'number'),item);
  }
  function readForm(form) { return Object.fromEntries(new FormData(form).entries()); }
  async function commit(next) { await OfficeProStore.save(next);data=next;notice='Salvo e sincronizado.';render();setTimeout(()=>{notice='';render()},2500); }
  document.addEventListener('click',async e=>{
    const viewButton=e.target.closest('[data-view]');if(viewButton){view=viewButton.dataset.view;notice='';render();return;}
    const el=e.target.closest('[data-act]');if(!el)return;const act=el.dataset.act,id=el.dataset.id;
    try {
      if(act==='auth-switch'){authMode=authMode==='login'?'signup':'login';notice='';return render();}
      if(act==='logout'){await OfficeProStore.signOut();user=null;data=OfficeProStore.empty();return render();}
      if(act==='close'){if($('#modal').open)$('#modal').close();return;}
      if(act==='new-client')return formFor('client');if(act==='edit-client')return formFor('client',client(id));
      if(act==='new-vehicle')return list('clients').length?formFor('vehicle'):alert('Cadastre um cliente antes.');if(act==='edit-vehicle')return formFor('vehicle',vehicle(id));
      if(act==='new-product')return formFor('product');if(act==='edit-product')return formFor('product',list('products').find(x=>x.id===id));
      if(act==='new-order')return list('clients').length?formFor('order'):alert('Cadastre um cliente antes.');if(act==='edit-order')return formFor('order',order(id));
      if(act==='payment'){const o=order(id);return showForm('Registrar pagamento','payment',field('Valor R$','amount',Number(o.labor||0)+Number(o.parts||0)-Number(o.discount||0),'number',true)+`<div class="grid2">${field('Data','paid_at',new Date().toISOString().slice(0,10),'date')}${select('Forma','method',['PIX','Dinheiro','Cartão','Transferência','Outro'].map(x=>[x,x]))}</div><input type="hidden" name="order_id" value="${U.escape(id)}">`);}
      const next=structuredClone(data);let key='',target;
      if(act==='delete-client'){if(next.vehicles.some(x=>x.client_id===id)||next.orders.some(x=>x.client_id===id))return alert('Este cliente está ligado a veículo ou ordem.');key='clients';}
      if(act==='delete-vehicle'){if(next.orders.some(x=>x.vehicle_id===id))return alert('Este veículo está ligado a uma ordem.');key='vehicles';}
      if(act==='delete-product')key='products';if(act==='delete-order')key='orders';
      if(key){if(!confirm('Excluir este registro?'))return;next[key]=next[key].filter(x=>x.id!==id);if(key==='orders')next.payments=next.payments.filter(x=>x.order_id!==id);if($('#modal').open)$('#modal').close();return await commit(next);}
    } catch(err) { alert(err.message||'Não foi possível concluir.'); }
  });
  document.addEventListener('submit',async e=>{
    if(e.target.id==='auth-form'){
      e.preventDefault();const v=readForm(e.target);
      try { if(authMode==='signup'){const {data:result,error}=await OfficeProStore.signUp(v.email,v.password);if(error)throw error;if(!result.session){notice='Confira seu e-mail para confirmar a conta e depois entre.';return render();}user=result.user;data=(await OfficeProStore.initialize()).data;}else{const result=await OfficeProStore.signIn(v.email,v.password);user=result.user;data=result.data;}notice='';return render(); }
      catch(err){notice=err.message==='Invalid login credentials'?'E-mail ou senha incorretos.':err.message;return render();}
    }
    if(e.target.id==='settings-form'){
      e.preventDefault();const next=structuredClone(data);next.settings.company=readForm(e.target).company.trim()||'Minha Oficina';return commit(next);
    }
    if(e.target.id!=='entry-form')return;e.preventDefault();const kind=e.target.dataset.kind,v=readForm(e.target),next=structuredClone(data),id=v.id||U.id();
    const normalize={...v,id};
    if(kind==='client')normalize.created_at=client(id)?.created_at||new Date().toISOString();
    if(kind==='vehicle'){normalize.year=Number(v.year)||'';if(!v.client_id)return alert('Selecione o cliente.');}
    if(kind==='product'){normalize.stock=Number(v.stock)||0;normalize.price=Number(v.price)||0;}
    if(kind==='order'){normalize.labor=Number(v.labor)||0;normalize.parts=Number(v.parts)||0;normalize.discount=Number(v.discount)||0;normalize.vehicle_id=v.vehicle_id||null;}
    if(kind==='payment'){
      const amount=Number(v.amount);if(!Number.isFinite(amount)||amount<=0){alert('Informe um valor válido.');return;}
      next.payments.push({id:U.id(),order_id:v.order_id,amount,method:v.method,paid_at:v.paid_at||new Date().toISOString().slice(0,10)});
      try{await commit(next);if($('#modal').open)$('#modal').close();}catch(err){alert(err.message||'Não foi possível salvar.');}
      return;
    }
    const key={client:'clients',vehicle:'vehicles',product:'products',order:'orders'}[kind];const at=next[key].findIndex(x=>x.id===id);if(at<0)next[key].push(normalize);else next[key][at]=normalize;
    try{await commit(next);if($('#modal').open)$('#modal').close();}catch(err){alert(err.message||'Não foi possível salvar.');}
  });
  OfficeProStore.initialize().then(result=>{user=result.user;data=result.data;render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}).catch(err=>{notice=`Falha ao conectar à nuvem: ${err.message}`;render();});
  document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&user){try{const result=await OfficeProStore.reload();data=result.data;render();}catch{}}});
})();

