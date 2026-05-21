
// =========================================================
// API PUBLICA (sem autenticacao)
// =========================================================
const API_URL = 'https://6a0f4d8a297ab30a46bb31c3.base44.app/functions/admApi';

async function apiCall(method, path, body) {
  // path ex: /entity/Produto ou /entity/Produto/123
  const res = await fetch(API_URL + path, {
    method, headers: {'Content-Type':'application/json'},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const db = {
  list: (e, q='') => apiCall('GET', `/entity/${e}${q ? '?'+q : ''}`),
  create: (e, d) => apiCall('POST', `/entity/${e}`, d),
  update: (e, id, d) => apiCall('PUT', `/entity/${e}/${id}`, d),
  delete: (e, id) => apiCall('DELETE', `/entity/${e}/${id}`)
};

// =========================================================
// HELPERS
// =========================================================
function nav(el, page) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('page-'+page).classList.add('active');
  const loaders = {produtos:loadProdutos, midias:loadMidias, flowsteps:loadSteps, faq:loadFAQ, config:loadConfig, prompt:carregarPrompts, simulador:initSim};
  if (loaders[page]) loaders[page]();
}

function openModal(id, data) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(m=>{
  m.addEventListener('click', e=>{ if(e.target===m) m.classList.remove('open'); });
});

function toast(msg, ok=true) {
  const a = document.createElement('div');
  a.className = 'alert '+(ok?'alert-ok':'alert-err');
  a.textContent = msg;
  document.querySelector('.page.active').prepend(a);
  setTimeout(()=>a.remove(), 3500);
}

function contarChars(inputId, outId) {
  const v = document.getElementById(inputId).value.length;
  document.getElementById(outId).textContent = v.toLocaleString('pt-BR') + ' caracteres';
}

function tagsToArr(str) { return str.split(',').map(s=>s.trim()).filter(Boolean); }
function arrToStr(arr) { return Array.isArray(arr) ? arr.join(', ') : ''; }

const tipoColor = {saudacao:'bb',produto:'bp',oferta:'by',quantidade:'bg',estado:'bb',pagamento:'bg',faq:'bp',encerramento:'bg',outro:'br'};
const tipoIcon = {saudacao:'👋',produto:'📦',oferta:'🔥',quantidade:'🔢',estado:'📍',pagamento:'💳',faq:'❓',encerramento:'✅',outro:'📁'};

// =========================================================
// DASHBOARD LOAD
// =========================================================
async function loadDashboard() {
  try {
    const [prods, steps, faqs, configs] = await Promise.all([
      db.list('Produto'), db.list('FlowStep'), db.list('FAQ'), db.list('ConfiguracaoAgente')
    ]);
    document.getElementById('cnt-prod').textContent = prods.filter(p=>p.ativo).length;
    document.getElementById('cnt-steps').textContent = steps.filter(s=>s.ativo).length;
    document.getElementById('cnt-faq').textContent = faqs.filter(f=>f.ativo).length;
    document.getElementById('st-flow').textContent = steps.length ? '✓ Configurado' : 'Vazio';
    document.getElementById('st-flow').className = 'badge '+(steps.length?'bg':'br');
    document.getElementById('st-faq').textContent = faqs.length ? '✓ Configurado' : 'Vazio';
    document.getElementById('st-faq').className = 'badge '+(faqs.length?'bg':'br');
    const promptCfg = configs.find(c=>c.chave==='prompt_geral');
    document.getElementById('st-prompt').textContent = (promptCfg&&promptCfg.valor) ? '✓ Configurado' : '⚠ Pendente';
    document.getElementById('st-prompt').className = 'badge '+((promptCfg&&promptCfg.valor)?'bg':'by');
  } catch(e) { console.error(e); }
}

// =========================================================
// PRODUTOS
// =========================================================
let produtos = [];
async function loadProdutos() {
  document.getElementById('area-produtos').innerHTML = '<div class="loading">⏳ Carregando...</div>';
  try {
    produtos = await db.list('Produto');
    if (!produtos.length) {
      document.getElementById('area-produtos').innerHTML = '<div class="empty"><div class="ei">📦</div><p>Nenhum produto ainda.<br>Clique em "+ Novo Produto" para começar.</p></div>';
      return;
    }
    document.getElementById('area-produtos').innerHTML = `
      <table class="table">
        <thead><tr><th>Produto</th><th>Preço</th><th>Categoria</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${produtos.map(p=>`
          <tr>
            <td>
              <div style="font-weight:600">${p.nome}</div>
              <div style="font-size:12px;color:#64748b;margin-top:3px">${(p.descricao||'').substring(0,50)}${p.descricao&&p.descricao.length>50?'...':''}</div>
            </td>
            <td>
              ${p.preco_promocional ? `<div style="color:#34d399;font-weight:700">R$ ${Number(p.preco_promocional).toFixed(2)}</div><div style="text-decoration:line-through;color:#475569;font-size:12px">R$ ${Number(p.preco||0).toFixed(2)}</div>` : `<div>R$ ${Number(p.preco||0).toFixed(2)}</div>`}
            </td>
            <td>${p.categoria ? `<span class="badge bb">${p.categoria}</span>` : '—'}</td>
            <td>${p.estoque ?? '—'}</td>
            <td>
              <span class="badge ${p.ativo?'bg':'br'}">${p.ativo?'✓ Ativo':'✗ Inativo'}</span>
              ${p.destaque ? '<span class="badge by" style="margin-left:4px">⭐ Destaque</span>' : ''}
            </td>
            <td><div class="action-btns">
              <button class="icon-btn ibe" onclick='editarProduto(${JSON.stringify(p)})'>✏️</button>
              <button class="icon-btn ibd" onclick="deletarProduto('${p.id}','${p.nome}')">🗑️</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) { toast('Erro ao carregar produtos: '+e.message, false); }
}

function editarProduto(p) {
  document.getElementById('mp-title').textContent = 'Editar Produto';
  document.getElementById('mp-id').value = p.id;
  document.getElementById('mp-nome').value = p.nome||'';
  document.getElementById('mp-desc').value = p.descricao||'';
  document.getElementById('mp-preco').value = p.preco||'';
  document.getElementById('mp-promo').value = p.preco_promocional||'';
  document.getElementById('mp-cat').value = p.categoria||'';
  document.getElementById('mp-estoque').value = p.estoque||'';
  document.getElementById('mp-foto').value = (p.fotos&&p.fotos[0])||'';
  document.getElementById('mp-video').value = p.video_url||'';
  // Preview foto existente
  const fotoUrl = (p.fotos&&p.fotos[0])||'';
  const fotoPrev = document.getElementById('mp-foto-preview');
  const fotoStatus = document.getElementById('mp-foto-status');
  if (fotoUrl) {
    fotoPrev.innerHTML = '<div class="upload-preview"><img src="'+fotoUrl+'" style="max-width:80px;max-height:60px;border-radius:6px;object-fit:cover"/><div class="prev-info"><div class="prev-name">Foto atual</div><div class="prev-size">Selecione outra para substituir</div></div></div>';
    fotoStatus.innerHTML = '<div class="upload-ok">✅ Foto salva.</div>';
    document.getElementById('mp-foto-bar').style.width='100%';
    document.getElementById('mp-foto-bar').style.background='#059669';
  } else { fotoPrev.innerHTML=''; fotoStatus.innerHTML=''; }
  // Preview vídeo existente
  const videoUrl = p.video_url||'';
  const videoPrev = document.getElementById('mp-video-preview');
  const videoStatus = document.getElementById('mp-video-status');
  if (videoUrl) {
    videoPrev.innerHTML = '<div class="upload-preview"><video src="'+videoUrl+'" style="max-width:80px;max-height:60px;border-radius:6px"></video><div class="prev-info"><div class="prev-name">Vídeo atual</div><div class="prev-size">Selecione outro para substituir</div></div></div>';
    videoStatus.innerHTML = '<div class="upload-ok">✅ Vídeo salvo.</div>';
    document.getElementById('mp-video-bar').style.width='100%';
    document.getElementById('mp-video-bar').style.background='#059669';
  } else { videoPrev.innerHTML=''; videoStatus.innerHTML=''; }
  document.getElementById('mp-tags').value = arrToStr(p.tags);
  document.getElementById('mp-ativo').value = String(p.ativo!==false);
  document.getElementById('mp-dest').value = String(!!p.destaque);
  openModal('mod-produto');
}

async function salvarProduto() {
  const nome = document.getElementById('mp-nome').value.trim();
  if (!nome) { toast('Preencha o nome do produto!', false); return; }
  const id = document.getElementById('mp-id').value;
  const foto = document.getElementById('mp-foto').value.trim();
  const data = {
    nome, descricao: document.getElementById('mp-desc').value,
    preco: parseFloat(document.getElementById('mp-preco').value)||0,
    preco_promocional: parseFloat(document.getElementById('mp-promo').value)||null,
    categoria: document.getElementById('mp-cat').value,
    estoque: parseInt(document.getElementById('mp-estoque').value)||0,
    fotos: foto ? [foto] : [],
    video_url: document.getElementById('mp-video').value,
    tags: tagsToArr(document.getElementById('mp-tags').value),
    ativo: document.getElementById('mp-ativo').value === 'true',
    destaque: document.getElementById('mp-dest').value === 'true'
  };
  try {
    if (id) await db.update('Produto', id, data);
    else await db.create('Produto', data);
    closeModal('mod-produto');
    document.getElementById('mp-id').value = '';
    document.getElementById('mp-title').textContent = 'Novo Produto';
    await loadProdutos();
    toast('✅ Produto salvo com sucesso!');
  } catch(e) { toast('Erro ao salvar: '+e.message, false); }
}

async function deletarProduto(id, nome) {
  if (!confirm(`Deletar o produto "${nome}"? Essa ação não pode ser desfeita.`)) return;
  try {
    await db.delete('Produto', id);
    await loadProdutos();
    toast('✅ Produto removido.');
  } catch(e) { toast('Erro ao deletar: '+e.message, false); }
}

// =========================================================
// MÍDIAS
// =========================================================
let midias = [];
async function loadMidias() {
  document.getElementById('area-midias').innerHTML = '<div class="loading">⏳ Carregando...</div>';
  try {
    midias = await db.list('Midia');
    if (!midias.length) {
      document.getElementById('area-midias').innerHTML = '<div class="empty"><div class="ei">🖼️</div><p>Nenhuma mídia cadastrada.<br>Adicione banners, ofertas e tutoriais.</p></div>';
      return;
    }
    const tipoLabel = {banner:'🖼️ Banner',oferta:'🔥 Oferta',imagem_promocional:'📸 Promo',tutorial_pagamento:'💳 Tutorial',outro:'📁 Outro'};
    document.getElementById('area-midias').innerHTML = `
      <table class="table">
        <thead><tr><th>Título</th><th>Tipo</th><th>URL</th><th>Validade</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${midias.map(m=>`
          <tr>
            <td><div style="font-weight:600">${m.titulo}</div><div style="font-size:12px;color:#64748b">${(m.descricao||'').substring(0,40)}</div></td>
            <td><span class="badge bp">${tipoLabel[m.tipo]||m.tipo}</span></td>
            <td><a href="${m.url}" target="_blank" style="color:#a78bfa;font-size:12px">🔗 Ver</a></td>
            <td style="font-size:13px;color:#64748b">${m.validade||'—'}</td>
            <td><span class="badge ${m.ativo?'bg':'br'}">${m.ativo?'✓ Ativo':'✗ Inativo'}</span></td>
            <td><div class="action-btns">
              <button class="icon-btn ibe" onclick='editarMidia(${JSON.stringify(m)})'>✏️</button>
              <button class="icon-btn ibd" onclick="deletarMidia('${m.id}','${m.titulo}')">🗑️</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) { toast('Erro ao carregar mídias: '+e.message, false); }
}

function editarMidia(m) {
  document.getElementById('mm-title').textContent = 'Editar Mídia';
  document.getElementById('mm-id').value = m.id;
  document.getElementById('mm-titulo').value = m.titulo||'';
  document.getElementById('mm-tipo').value = m.tipo||'banner';
  document.getElementById('mm-url').value = m.url||'';
  document.getElementById('mm-desc').value = m.descricao||'';
  document.getElementById('mm-val').value = m.validade||'';
  document.getElementById('mm-ordem').value = m.ordem||'';
  document.getElementById('mm-ativo').value = String(m.ativo!==false);
  // Mostrar preview do arquivo já salvo
  const prev = document.getElementById('mm-preview');
  const status = document.getElementById('mm-status');
  if (m.url) {
    const isVid = /\.(mp4|webm|ogg|mov|avi)$/i.test(m.url);
    prev.innerHTML = '<div class="upload-preview">'
      + (isVid ? '<video src="'+m.url+'" style="max-width:80px;max-height:60px;border-radius:6px" controls></video>' : '<img src="'+m.url+'" style="max-width:80px;max-height:60px;border-radius:6px;object-fit:cover"/>')
      + '<div class="prev-info"><div class="prev-name">Arquivo atual</div><div class="prev-size">'+m.url.split('/').pop()+'</div></div></div>';
    status.innerHTML = '<div class="upload-ok">✅ Arquivo já enviado. Selecione outro para substituir.</div>';
    document.getElementById('mm-bar').style.width='100%';
    document.getElementById('mm-bar').style.background='#059669';
  } else { prev.innerHTML=''; status.innerHTML=''; }
  openModal('mod-midia');
}

async function salvarMidia() {
  const titulo = document.getElementById('mm-titulo').value.trim();
  const url = document.getElementById('mm-url').value.trim();
  if (!titulo||!url) { toast('Título e URL são obrigatórios!', false); return; }
  const id = document.getElementById('mm-id').value;
  const data = {
    titulo, url, tipo: document.getElementById('mm-tipo').value,
    descricao: document.getElementById('mm-desc').value,
    validade: document.getElementById('mm-val').value||null,
    ordem: parseInt(document.getElementById('mm-ordem').value)||1,
    ativo: document.getElementById('mm-ativo').value === 'true'
  };
  try {
    if (id) await db.update('Midia', id, data);
    else await db.create('Midia', data);
    closeModal('mod-midia');
    document.getElementById('mm-id').value=''; document.getElementById('mm-title').textContent='Nova Mídia';
    await loadMidias(); toast('✅ Mídia salva!');
  } catch(e) { toast('Erro: '+e.message, false); }
}

async function deletarMidia(id, titulo) {
  if (!confirm(`Deletar "${titulo}"?`)) return;
  try { await db.delete('Midia', id); await loadMidias(); toast('✅ Mídia removida.'); }
  catch(e) { toast('Erro: '+e.message, false); }
}

// =========================================================
// FLOWSTEPS
// =========================================================
let steps = [];
async function loadSteps() {
  document.getElementById('area-steps').innerHTML = '<div class="loading">⏳ Carregando...</div>';
  try {
    steps = await db.list('FlowStep');
    steps.sort((a,b)=>(a.etapa||0)-(b.etapa||0));
    if (!steps.length) {
      document.getElementById('area-steps').innerHTML = '<div class="empty"><div class="ei">🔄</div><p>Nenhuma etapa cadastrada.</p></div>';
      return;
    }
    document.getElementById('area-steps').innerHTML = steps.map(s=>`
      <div class="step-card">
        <div class="step-num">${s.etapa}</div>
        <div class="step-body">
          <div class="step-title">${s.nome} <span class="badge ${tipoColor[s.tipo]||'bp'}">${tipoIcon[s.tipo]||'📁'} ${s.tipo}</span></div>
          <div class="step-msg">${(s.mensagem||'').replace(/\n/g,'<br>')}</div>
          <div class="step-meta">
            <span class="badge ${s.ativo?'bg':'br'}">${s.ativo?'✓ Ativo':'✗ Inativo'}</span>
            ${s.proxima_etapa ? `<span class="badge bb">→ Etapa ${s.proxima_etapa}</span>` : '<span class="badge br">→ Fim do fluxo</span>'}
            ${s.midia_url ? '<span class="badge by">📎 Tem mídia</span>' : ''}
          </div>
        </div>
        <div class="action-btns" style="flex-shrink:0">
          <button class="icon-btn ibe" onclick='editarStep(${JSON.stringify(s)})'>✏️</button>
          <button class="icon-btn ibd" onclick="deletarStep('${s.id}','${s.nome}')">🗑️</button>
        </div>
      </div>`).join('');
  } catch(e) { toast('Erro ao carregar etapas: '+e.message, false); }
}

function editarStep(s) {
  document.getElementById('ms-title').textContent = 'Editar Etapa';
  document.getElementById('ms-id').value = s.id;
  document.getElementById('ms-etapa').value = s.etapa||'';
  document.getElementById('ms-nome').value = s.nome||'';
  document.getElementById('ms-tipo').value = s.tipo||'outro';
  document.getElementById('ms-msg').value = s.mensagem||'';
  document.getElementById('ms-prox').value = s.proxima_etapa||'';
  document.getElementById('ms-midia').value = s.midia_url||'';
  document.getElementById('ms-palavras').value = arrToStr(s.palavras_chave);
  document.getElementById('ms-ativo').value = String(s.ativo!==false);
  openModal('mod-step');
}

async function salvarStep() {
  const nome = document.getElementById('ms-nome').value.trim();
  const etapa = document.getElementById('ms-etapa').value;
  const msg = document.getElementById('ms-msg').value.trim();
  if (!nome||!etapa||!msg) { toast('Nome, número e mensagem são obrigatórios!', false); return; }
  const id = document.getElementById('ms-id').value;
  const prox = document.getElementById('ms-prox').value;
  const data = {
    nome, etapa: parseInt(etapa), mensagem: msg,
    tipo: document.getElementById('ms-tipo').value,
    proxima_etapa: prox ? parseInt(prox) : null,
    midia_url: document.getElementById('ms-midia').value||null,
    palavras_chave: tagsToArr(document.getElementById('ms-palavras').value),
    ativo: document.getElementById('ms-ativo').value === 'true'
  };
  try {
    if (id) await db.update('FlowStep', id, data);
    else await db.create('FlowStep', data);
    closeModal('mod-step');
    document.getElementById('ms-id').value=''; document.getElementById('ms-title').textContent='Nova Etapa';
    await loadSteps(); toast('✅ Etapa salva!');
  } catch(e) { toast('Erro: '+e.message, false); }
}

async function deletarStep(id, nome) {
  if (!confirm(`Deletar etapa "${nome}"?`)) return;
  try { await db.delete('FlowStep', id); await loadSteps(); toast('✅ Etapa removida.'); }
  catch(e) { toast('Erro: '+e.message, false); }
}

// =========================================================
// FAQ
// =========================================================
let faqs = [];
async function loadFAQ() {
  document.getElementById('area-faq').innerHTML = '<div class="loading">⏳ Carregando...</div>';
  try {
    faqs = await db.list('FAQ');
    faqs.sort((a,b)=>(a.ordem||99)-(b.ordem||99));
    if (!faqs.length) {
      document.getElementById('area-faq').innerHTML = '<div class="empty"><div class="ei">❓</div><p>Nenhuma pergunta cadastrada.</p></div>';
      return;
    }
    document.getElementById('area-faq').innerHTML = `
      <table class="table">
        <thead><tr><th>#</th><th>Pergunta</th><th>Categoria</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${faqs.map(f=>`
          <tr>
            <td style="color:#64748b;font-size:13px">${f.ordem||'—'}</td>
            <td>
              <div style="font-weight:600">${f.pergunta}</div>
              <div style="font-size:12px;color:#64748b;margin-top:3px">${(f.resposta||'').substring(0,60)}${(f.resposta||'').length>60?'...':''}</div>
            </td>
            <td>${f.categoria ? `<span class="badge bb">${f.categoria}</span>` : '—'}</td>
            <td><span class="badge ${f.ativo?'bg':'br'}">${f.ativo?'✓ Ativo':'✗ Inativo'}</span></td>
            <td><div class="action-btns">
              <button class="icon-btn ibe" onclick='editarFAQ(${JSON.stringify(f)})'>✏️</button>
              <button class="icon-btn ibd" onclick="deletarFAQ('${f.id}','${f.pergunta}')">🗑️</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) { toast('Erro ao carregar FAQ: '+e.message, false); }
}

function editarFAQ(f) {
  document.getElementById('mf-title').textContent = 'Editar Pergunta';
  document.getElementById('mf-id').value = f.id;
  document.getElementById('mf-perg').value = f.pergunta||'';
  document.getElementById('mf-resp').value = f.resposta||'';
  document.getElementById('mf-cat').value = f.categoria||'';
  document.getElementById('mf-palavras').value = arrToStr(f.palavras_chave);
  document.getElementById('mf-ordem').value = f.ordem||'';
  document.getElementById('mf-ativo').value = String(f.ativo!==false);
  openModal('mod-faq');
}

async function salvarFAQ() {
  const perg = document.getElementById('mf-perg').value.trim();
  const resp = document.getElementById('mf-resp').value.trim();
  if (!perg||!resp) { toast('Pergunta e resposta são obrigatórias!', false); return; }
  const id = document.getElementById('mf-id').value;
  const data = {
    pergunta: perg, resposta: resp,
    categoria: document.getElementById('mf-cat').value,
    palavras_chave: tagsToArr(document.getElementById('mf-palavras').value),
    ordem: parseInt(document.getElementById('mf-ordem').value)||99,
    ativo: document.getElementById('mf-ativo').value === 'true'
  };
  try {
    if (id) await db.update('FAQ', id, data);
    else await db.create('FAQ', data);
    closeModal('mod-faq');
    document.getElementById('mf-id').value=''; document.getElementById('mf-title').textContent='Nova Pergunta';
    await loadFAQ(); toast('✅ Pergunta salva!');
  } catch(e) { toast('Erro: '+e.message, false); }
}

async function deletarFAQ(id, perg) {
  if (!confirm(`Deletar "${perg}"?`)) return;
  try { await db.delete('FAQ', id); await loadFAQ(); toast('✅ Removida.'); }
  catch(e) { toast('Erro: '+e.message, false); }
}

// =========================================================
// PROMPTS (texto corrido)
// =========================================================
let promptIds = {};
async function carregarPrompts() {
  try {
    const configs = await db.list('ConfiguracaoAgente');
    const chaves = ['prompt_geral','prompt_regras','prompt_script'];
    chaves.forEach(c => {
      const found = configs.find(x=>x.chave===c);
      if (found) {
        promptIds[c] = found.id;
        document.getElementById('prompt-'+c.replace('prompt_','')).value = found.valor||'';
        contarChars('prompt-'+c.replace('prompt_',''),'cc-'+c.replace('prompt_',''));
      }
    });
  } catch(e) { toast('Erro ao carregar prompts: '+e.message, false); }
}

async function salvarPrompts() {
  const campos = [
    {chave:'prompt_geral', campo:'prompt-geral', desc:'Instruções gerais do agente'},
    {chave:'prompt_regras', campo:'prompt-regras', desc:'Regras de comportamento'},
    {chave:'prompt_script', campo:'prompt-script', desc:'Script de vendas'}
  ];
  try {
    for (const {chave, campo, desc} of campos) {
      const valor = document.getElementById(campo).value;
      if (promptIds[chave]) {
        await db.update('ConfiguracaoAgente', promptIds[chave], {chave, valor, descricao: desc, categoria:'comportamento'});
      } else {
        const novo = await db.create('ConfiguracaoAgente', {chave, valor, descricao: desc, categoria:'comportamento'});
        promptIds[chave] = novo.id;
      }
    }
    toast('✅ Prompts salvos com sucesso! O agente vai usar essas instruções.');
  } catch(e) { toast('Erro ao salvar prompts: '+e.message, false); }
}

// =========================================================
// CONFIGURAÇÕES
// =========================================================
let configData = [];
async function loadConfig() {
  document.getElementById('area-config').innerHTML = '<div class="loading">⏳ Carregando...</div>';
  try {
    configData = await db.list('ConfiguracaoAgente');
    const cfgFiltradas = configData.filter(c=>!c.chave.startsWith('prompt_'));
    if (!cfgFiltradas.length) {
      document.getElementById('area-config').innerHTML = '<div class="empty"><div class="ei">⚙️</div><p>Nenhuma configuração encontrada.</p></div>';
      return;
    }
    document.getElementById('area-config').innerHTML = cfgFiltradas.map(c=>`
      <div style="display:flex;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid #1e1e38">
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${c.descricao||c.chave}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">${c.chave} · <span class="badge bp">${c.categoria||'geral'}</span></div>
        </div>
        <input type="text" id="cfg-${c.id}" value="${c.valor||''}" style="width:240px" placeholder="(vazio)"/>
        <button class="btn btn-success" style="padding:8px 14px;font-size:12px" onclick="salvarConfig('${c.id}','${c.chave}','${c.descricao}','${c.categoria}')">Salvar</button>
      </div>`).join('');
  } catch(e) { toast('Erro: '+e.message, false); }
}

async function salvarConfig(id, chave, descricao, categoria) {
  const valor = document.getElementById('cfg-'+id).value;
  try {
    await db.update('ConfiguracaoAgente', id, {chave, valor, descricao, categoria});
    toast('✅ Configuração salva!');
  } catch(e) { toast('Erro: '+e.message, false); }
}



// =========================================================
// UPLOAD DE ARQUIVOS
// =========================================================
const UPLOAD_URL = 'https://6a0f4d8a297ab30a46bb31c3.base44.app/functions/uploadMidia';

function dzOver(e, zoneId) {
  e.preventDefault();
  document.getElementById(zoneId).classList.add('dragover');
}
function dzLeave(zoneId) {
  document.getElementById(zoneId).classList.remove('dragover');
}
function dzDrop(e, zoneId, inputId, previewId, urlId) {
  e.preventDefault();
  dzLeave(zoneId);
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const input = document.getElementById(inputId);
  // Criar DataTransfer para setar arquivo no input
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  // Determinar barId e statusId a partir do previewId
  const base = previewId.replace('-preview','');
  handleFileSelect(input, previewId, urlId, base+'-bar', base+'-status');
}

async function handleFileSelect(input, previewId, urlId, barId, statusId) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById(statusId);
  const barEl = document.getElementById(barId);
  const previewEl = document.getElementById(previewId);
  const urlEl = document.getElementById(urlId);

  // Reset
  statusEl.innerHTML = '<div style="color:#94a3b8;font-size:12px;margin-top:6px">⏳ Enviando '+file.name+'...</div>';
  barEl.style.width = '10%';
  previewEl.innerHTML = '';
  urlEl.value = '';

  // Animar barra
  let prog = 10;
  const barAnim = setInterval(() => {
    prog = Math.min(prog + Math.random()*15, 85);
    barEl.style.width = prog + '%';
  }, 300);

  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(UPLOAD_URL, { method: 'POST', body: fd });
    const data = await res.json();
    clearInterval(barAnim);

    if (!res.ok || data.error) throw new Error(data.error || 'Erro no upload');

    barEl.style.width = '100%';
    barEl.style.background = '#059669';
    urlEl.value = data.url;

    const tamanho = (file.size / 1024 / 1024).toFixed(2);
    statusEl.innerHTML = '<div class="upload-ok">✅ '+file.name+' enviado com sucesso ('+tamanho+' MB)</div>';

    // Preview
    const isVideo = file.type.startsWith('video/');
    const isImg = file.type.startsWith('image/');
    const localUrl = URL.createObjectURL(file);
    previewEl.innerHTML = '<div class="upload-preview">'
      + (isImg ? '<img src="'+localUrl+'" alt="preview"/>' : '')
      + (isVideo ? '<video src="'+localUrl+'" style="max-width:80px;max-height:60px;border-radius:6px"></video>' : '')
      + '<div class="prev-info"><div class="prev-name">'+file.name+'</div><div class="prev-size">'+tamanho+' MB · '+(isImg?'Imagem':'Vídeo')+'</div></div>'
      + '</div>';

  } catch(e) {
    clearInterval(barAnim);
    barEl.style.width = '100%';
    barEl.style.background = '#dc2626';
    statusEl.innerHTML = '<div class="upload-err">❌ Erro: '+e.message+'</div>';
  }
}

// Resetar upload ao abrir modal
const _origOpenModal = openModal;

// =========================================================
// SIMULADOR
// =========================================================
let simState = { etapa: 1, msgs: 0, produtoDetectado: null, historico: [] };
let simSteps = [], simFAQs = [], simProdutos = [], simConfig = {};

async function initSim() {
  try {
    [simSteps, simFAQs, simProdutos] = await Promise.all([
      db.list('FlowStep'), db.list('FAQ'), db.list('Produto')
    ]);
    const cfgs = await db.list('ConfiguracaoAgente');
    cfgs.forEach(c => { simConfig[c.chave] = c.valor; });
    simSteps.sort((a,b)=>(a.etapa||0)-(b.etapa||0));
    const nome = simConfig['nome_empresa'] || 'Agente IA';
    document.getElementById('sim-agent-name').textContent = nome;
    simLog('✅ Banco carregado: '+simSteps.length+' etapas, '+simFAQs.length+' FAQs, '+simProdutos.length+' produtos');
    iniciarFluxo();
  } catch(e) { simLog('❌ Erro: '+e.message); }
}

function resetarSim() {
  simState = { etapa: 1, msgs: 0, produtoDetectado: null, historico: [] };
  document.getElementById('sim-chat').innerHTML = '';
  document.getElementById('sim-log').innerHTML = '<div>Reiniciando...</div>';
  atualizarPainel();
  initSim();
}

function iniciarFluxo() {
  const step = simSteps.find(s => s.ativo !== false && s.etapa == 1);
  if (step) {
    setTimeout(() => {
      addMsg('agent', step.mensagem, step.midia_url);
      simState.etapa = step.etapa;
      atualizarPainel(step);
      simLog('▶ Etapa 1 iniciada: '+step.nome);
    }, 400);
  } else {
    addMsg('agent', 'Olá! Como posso ajudar? 😊');
    simLog('⚠ Nenhuma etapa 1 encontrada — usando saudação padrão');
  }
}

function atualizarPainel(step) {
  document.getElementById('sd-etapa').textContent = simState.etapa || '—';
  document.getElementById('sd-tipo').textContent = step ? step.tipo : '—';
  document.getElementById('sd-prox').textContent = step && step.proxima_etapa ? 'Etapa '+step.proxima_etapa : (step ? 'Fim' : '—');
  document.getElementById('sd-msgs').textContent = simState.msgs;
  document.getElementById('sd-prod').textContent = simState.produtoDetectado || '—';
  document.getElementById('sim-etapa-badge').textContent = 'Etapa '+simState.etapa;
}

function simLog(msg) {
  const el = document.getElementById('sim-log');
  const d = document.createElement('div');
  d.textContent = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) + ' ' + msg;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

function addMsg(tipo, texto, midiaUrl) {
  const chat = document.getElementById('sim-chat');
  const isAgent = tipo === 'agent';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:'+(isAgent?'flex-start':'flex-end');

  const bubble = document.createElement('div');
  bubble.style.cssText = 'max-width:75%;padding:12px 16px;border-radius:'+(isAgent?'4px 16px 16px 16px':'16px 4px 16px 16px')+';font-size:14px;line-height:1.6;word-break:break-word;'+(isAgent?'background:#1e1e38;color:#e2e8f0':'background:#7c3aed;color:#fff');
  bubble.innerHTML = texto.replace(/
/g,'<br>');
  wrap.appendChild(bubble);

  if (midiaUrl) {
    const img = document.createElement('img');
    img.src = midiaUrl;
    img.style.cssText = 'max-width:220px;border-radius:10px;margin-top:6px;border:1px solid #2d2d4e';
    img.onerror = () => img.style.display='none';
    wrap.appendChild(img);
  }

  const time = document.createElement('div');
  time.style.cssText = 'font-size:10px;color:#475569;margin-top:4px;padding:0 4px';
  time.textContent = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  wrap.appendChild(time);

  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
  simState.msgs++;
  document.getElementById('sd-msgs').textContent = simState.msgs;
}

function simMsg(txt) {
  document.getElementById('sim-input').value = txt;
  enviarSim();
}

async function enviarSim() {
  const input = document.getElementById('sim-input');
  const txt = input.value.trim();
  if (!txt) return;
  input.value = '';
  addMsg('user', txt);
  simLog('👤 Cliente: "'+txt+'"');

  // Desabilita input enquanto processa
  input.disabled = true;
  document.getElementById('sim-btn').disabled = true;

  setTimeout(async () => {
    await processarMsg(txt);
    input.disabled = false;
    document.getElementById('sim-btn').disabled = false;
    input.focus();
  }, 600);
}

async function processarMsg(txt) {
  const lower = txt.toLowerCase();

  // 1. Checar FAQ primeiro
  const faqMatch = simFAQs.find(f => {
    if (!f.ativo) return false;
    if (!f.palavras_chave || !f.palavras_chave.length) {
      return lower.includes(f.pergunta.toLowerCase().substring(0,15));
    }
    return f.palavras_chave.some(k => lower.includes(k.toLowerCase()));
  });

  if (faqMatch) {
    simLog('❓ FAQ match: "'+faqMatch.pergunta+'"');
    await delay(500);
    addMsg('agent', faqMatch.resposta);
    return;
  }

  // 2. Detectar produto mencionado
  const prodMatch = simProdutos.find(p => {
    if (!p.ativo) return false;
    if (lower.includes(p.nome.toLowerCase())) return true;
    if (p.tags) return p.tags.some(t => lower.includes(t.toLowerCase()));
    return false;
  });

  if (prodMatch && !simState.produtoDetectado) {
    simState.produtoDetectado = prodMatch.nome;
    document.getElementById('sd-prod').textContent = prodMatch.nome;
    simLog('📦 Produto detectado: '+prodMatch.nome);
    await delay(400);
    let msg = '📦 *'+prodMatch.nome+'*\n\n';
    if (prodMatch.descricao) msg += prodMatch.descricao+'\n\n';
    if (prodMatch.preco_promocional) {
      msg += '💰 De R$ '+Number(prodMatch.preco||0).toFixed(2)+' por R$ '+Number(prodMatch.preco_promocional).toFixed(2)+' 🔥';
    } else if (prodMatch.preco) {
      msg += '💰 R$ '+Number(prodMatch.preco).toFixed(2);
    }
    if (prodMatch.estoque) msg += '\n📦 Estoque: '+prodMatch.estoque+' unidades';
    addMsg('agent', msg, prodMatch.fotos && prodMatch.fotos[0]);
    await delay(800);
  }

  // 3. Seguir etapa do fluxo
  const stepAtual = simSteps.find(s => s.ativo !== false && s.etapa == simState.etapa);
  let proximaEtapa = stepAtual ? stepAtual.proxima_etapa : null;

  // Tentar match por palavras-chave em outras etapas
  const stepKeyMatch = simSteps.find(s => {
    if (!s.ativo || s.etapa == simState.etapa) return false;
    if (!s.palavras_chave || !s.palavras_chave.length) return false;
    return s.palavras_chave.some(k => lower.includes(k.toLowerCase()));
  });

  let targetStep;
  if (stepKeyMatch && stepKeyMatch.etapa != simState.etapa) {
    targetStep = stepKeyMatch;
    simLog('🔑 Match por palavra-chave → Etapa '+stepKeyMatch.etapa+' ('+stepKeyMatch.nome+')');
  } else if (proximaEtapa) {
    targetStep = simSteps.find(s => s.ativo !== false && s.etapa == proximaEtapa);
    simLog('➡ Avançando para Etapa '+proximaEtapa);
  }

  if (targetStep) {
    simState.etapa = targetStep.etapa;
    await delay(700);
    addMsg('agent', targetStep.mensagem, targetStep.midia_url);
    atualizarPainel(targetStep);
  } else if (!prodMatch) {
    // Resposta genérica
    simLog('⚠ Sem match — resposta genérica');
    await delay(500);
    const genResps = [
      'Pode me dar mais detalhes? 😊',
      'Entendido! Como posso ajudar mais?',
      'Claro! Me conta mais o que você precisa.',
      'Perfeito! Estou aqui para ajudar 🙌'
    ];
    addMsg('agent', genResps[Math.floor(Math.random()*genResps.length)]);
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }


// =========================================================
// INIT
// =========================================================
loadDashboard();
