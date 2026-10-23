(() => {
  const $=s=>document.querySelector(s), U=OfficeProUtil, nav=[['orders','Ordens'],['clients','Clientes'],['finance','Financeiro'],['settings','Sistema']];
  let user=null,data=OfficeProStore.empty(),view='orders',authMode='login',notice='';
  const list=k=>data[k]||[], client=id=>list('clients').find(x=>x.id===id), order=id=>list('orders').find(x=>x.id===id);
  const button=(label,act,id='',cls='secondary')=>`<button class="${cls}" data-act="${act}" data-id="${U.escape(id)}">${label}</button>`;
  function auth(){ $('#tabs').innerHTML='';$('#app').innerHTML=`<section class="auth"><div class="brand">ALEDA <span>FUNILARIA</span></div><h1>${authMode==='login'?'Acessar Funilaria':'Criar acesso'}</h1><p class="muted">Use a mesma conta do app Gestão no computador.</p>${notice?`<p class="notice error">${U.escape(notice)}</p>`:''}<form id="auth-form"><label>E-mail</label><input name="email" type="email" autocomplete="username" required><label>Senha</label><input name="password" type="password" minlength="8" autocomplete="${authMode==='login'?'current-password':'new-password'}" required><button>${authMode==='login'?'Entrar':'Criar conta'}</button></form><button class="secondary switch" data-act="auth-switch">${authMode==='login'?'Criar uma conta':'Já tenho conta'}</button></section>`; }
  function shell(title,content,action=''){
    $('#tabs').innerHTML=nav.map(([id,label])=>`<button data-view="${id}" class="${view===id?'active':''}">${label}</button>`).join('');
    $('#app').innerHTML=`<header class="brand">ALEDA <span>FUNILARIA</span></header><div class="top"><h1>${title}</h1>${action}</div>${notice?`<p class="notice">${U.escape(notice)}</p>`:''}${content}<p class="status">Sincronizado com Gestão · ${U.escape(user.email)}</p>`;
  }
  function render(){
    if(!user)return auth();
    if(view==='orders'){
      const cards=[...list('orders')].reverse().map(x=>`<article class="order-card"><h2>OS #${U.escape(x.number||x.id.slice(0,6))} · ${U.escape(client(x.client_id)?.name||'Cliente')}</h2><p>${U.escape(x.vehicle_text||'Veículo não informado')}</p><p class="meta">${U.escape(x.status||'Aberta')} · ${U.date(x.opened_at)} · ${U.money(Number(x.labor||0)+Number(x.parts||0)-Number(x.discount||0))}</p><p>${U.escape(x.complaint||'Sem descrição')}</p><div class="actions">${button('Abrir','edit-order',x.id)}${button('Pagamento','payment',x.id)}</div></article>`).join('');
      return shell('Serviços',cards||'<div class="panel empty">Nenhuma ordem cadastrada.</div>',button('+ Nova ordem','new-order','',''));
    }
    if(view==='clients'){
      const cards=list('clients').map(x=>`<article class="order-card"><h2>${U.escape(x.name)}</h2><p>${U.escape(x.phone||'Sem telefone')}</p><p class="meta">${U.escape(x.email||'')}</p><div class="actions">${button('Editar','edit-client',x.id)}${button('Excluir','delete-client',x.id,'danger')}</div></article>`).join('');
      return shell('Clientes',cards||'<div class="panel empty">Nenhum cliente cadastrado.</div>',button('+ Cliente','new-client','',''));
    }
    if(view==='finance'){
      const total=list('orders').reduce((n,x)=>n+Number(x.labor||0)+Number(x.parts||0)-Number(x.discount||0),0),paid=list('payments').reduce((n,x)=>n+Number(x.amount||0),0);
      const payments=[...list('payments')].reverse().map(p=>`<article class="order-card"><h2>${U.money(p.amount)} · ${U.escape(client(order(p.order_id)?.client_id)?.name||'Cliente')}</h2><p class="meta">${U.date(p.paid_at)} · ${U.escape(p.method||'')}</p></article>`).join('');
      return shell('Financeiro',`<div class="cards"><div class="card">Ordens<strong>${U.money(total)}</strong></div><div class="card">Recebido<strong>${U.money(paid)}</strong></div><div class="card">A receber<strong>${U.money(Math.max(0,total-paid))}</strong></div><div class="card">Pagamentos<strong>${list('payments').length}</strong></div></div><h2 style="margin-top:22px">Últimos pagamentos</h2>${payments||'<div class="panel empty">Nenhum pagamento registrado.</div>'}`);
    }
    return shell('Sistema',`<div class="panel"><h2>Conta compartilhada</h2><p>${U.escape(user.email)}</p><p class="muted">Os dados ficam na mesma nuvem usada pelo app Gestão no computador.</p></div><div class="panel"><h2>Instalar no celular</h2><p>Abra o menu do navegador e escolha <b>Adicionar à tela inicial</b> para criar o ícone.</p></div><div class="panel">${button('Sair da conta','logout')}</div>`);
  }
  function field(label,name,value='',type='text',required=false){return `<label>${label}</label><input name="${name}" type="${type}" value="${U.escape(value)}" ${required?'required':''}>`;}
  function select(label,name,items,value=''){return `<label>${label}</label><select name="${name}">${items.map(([v,t])=>`<option value="${U.escape(v)}" ${v===value?'selected':''}>${U.escape(t)}</option>`).join('')}</select>`;}
  function modal(title,kind,fields,item={}){$('#modal-content').innerHTML=`<h2>${title}</h2><form id="entry-form" data-kind="${kind}"><input type="hidden" name="id" value="${U.escape(item.id||'')}">${fields}<div class="dialog-actions"><button type="button" class="secondary" data-act="close">Cancelar</button><button>Salvar</button></div></form>`;$('#modal').showModal();}
  function clientForm(item={}){modal(item.id?'Editar cliente':'Novo cliente','client',field('Nome *','name',item.name,'text',true)+field('Telefone','phone',item.phone,'tel')+field('E-mail','email',item.email,'email')+field('CPF / CNPJ','document',item.document),item);}
  function orderForm(item={}){modal(item.id?'Editar ordem':'Nova ordem','order',select('Cliente','client_id',list('clients').map(x=>[x.id,x.name]),item.client_id)+field('Veículo','vehicle_text',item.vehicle_text)+`<label>Problema relatado</label><textarea name="complaint">${U.escape(item.complaint||'')}</textarea><label>Diagnóstico</label><textarea name="diagnosis">${U.escape(item.diagnosis||'')}</textarea><div class="grid2">${field('Mão de obra R$','labor',item.labor||0,'number')}${field('Peças R$','parts',item.parts||0,'number')}</div><div class="grid2">${field('Desconto R$','discount',item.discount||0,'number')}${select('Situação','status',['Aberta','Em andamento','Aguardando peças','Concluída','Cancelada'].map(x=>[x,x]),item.status||'Aberta')}</div>${field('Data de abertura','opened_at',item.opened_at||new Date().toISOString().slice(0,10),'date')}`,item);}
  function read(form){return Object.fromEntries(new FormData(form).entries());}
  async function commit(next){await OfficeProStore.save(next);data=next;notice='Salvo e sincronizado.';render();setTimeout(()=>{notice='';render()},2500);}
  document.addEventListener('click',async e=>{
    const t=e.target.closest('[data-view]');if(t){view=t.dataset.view;notice='';render();return;}
    const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,id=el.dataset.id;
    try{
      if(a==='auth-switch'){authMode=authMode==='login'?'signup':'login';notice='';return render();}
      if(a==='logout'){await OfficeProStore.signOut();user=null;data=OfficeProStore.empty();return render();}
      if(a==='close'){if($('#modal').open)$('#modal').close();return;}
      if(a==='new-client')return clientForm();if(a==='edit-client')return clientForm(client(id));
      if(a==='new-order')return list('clients').length?orderForm():clientForm();if(a==='edit-order')return orderForm(order(id));
      if(a==='payment'){const o=order(id);return modal('Registrar pagamento','payment',field('Valor R$','amount',Number(o.labor||0)+Number(o.parts||0)-Number(o.discount||0),'number',true)+select('Forma','method',['PIX','Dinheiro','Cartão','Transferência','Outro'].map(x=>[x,x]))+field('Data','paid_at',new Date().toISOString().slice(0,10),'date')+'<input type="hidden" name="order_id" value="'+U.escape(id)+'">');}
      if(a==='delete-client'){if(data.vehicles.some(x=>x.client_id===id)||data.orders.some(x=>x.client_id===id))return alert('Este cliente está ligado a uma ordem ou veículo.');if(!confirm('Excluir este cliente?'))return;const next=structuredClone(data);next.clients=next.clients.filter(x=>x.id!==id);return await commit(next);}
    }catch(err){alert(err.message||'Não foi possível concluir.');}
  });
  document.addEventListener('submit',async e=>{
    if(e.target.id==='auth-form'){
      e.preventDefault();const v=read(e.target);try{if(authMode==='signup'){const {data:r,error}=await OfficeProStore.signUp(v.email,v.password);if(error)throw error;if(!r.session){notice='Confira seu e-mail para confirmar a conta e depois entre.';return render();}const result=await OfficeProStore.initialize();user=result.user;data=result.data;}else{const result=await OfficeProStore.signIn(v.email,v.password);user=result.user;data=result.data;}notice='';return render();}catch(err){notice=err.message==='Invalid login credentials'?'E-mail ou senha incorretos.':err.message;return render();}
    }
    if(e.target.id!=='entry-form')return;e.preventDefault();const kind=e.target.dataset.kind,v=read(e.target),next=structuredClone(data),id=v.id||U.id();
    if(kind==='client'){
      const row={id,name:v.name.trim(),phone:v.phone||'',email:v.email||'',document:v.document||'',created_at:client(id)?.created_at||new Date().toISOString()};const i=next.clients.findIndex(x=>x.id===id);if(i<0)next.clients.push(row);else next.clients[i]=row;
    }else if(kind==='order'){
      if(!v.client_id){alert('Selecione um cliente.');return;}const row={...order(id),...v,id,labor:Number(v.labor)||0,parts:Number(v.parts)||0,discount:Number(v.discount)||0,created_at:order(id)?.created_at||new Date().toISOString()};const i=next.orders.findIndex(x=>x.id===id);if(i<0)next.orders.push(row);else next.orders[i]=row;
    }else if(kind==='payment'){
      const amount=Number(v.amount);if(!Number.isFinite(amount)||amount<=0){alert('Informe um valor válido.');return;}next.payments.push({id:U.id(),order_id:v.order_id,amount,method:v.method,paid_at:v.paid_at||new Date().toISOString().slice(0,10)});
    }
    try{await commit(next);if($('#modal').open)$('#modal').close();}catch(err){alert(err.message||'Não foi possível salvar.');}
  });
  OfficeProStore.initialize().then(r=>{user=r.user;data=r.data;render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}).catch(err=>{notice=`Falha ao conectar à nuvem: ${err.message}`;render();});
  document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&user){try{const r=await OfficeProStore.reload();data=r.data;render();}catch{}}});
})();

