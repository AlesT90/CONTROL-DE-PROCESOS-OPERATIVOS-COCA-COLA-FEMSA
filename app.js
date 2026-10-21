(() => {
  'use strict';

  const modules = {
    sedes: {
      title: 'Sedes', eyebrow: 'INFRAESTRUCTURA', description: 'Administra las plantas y centros de distribución de la región.', singular: 'sede', plural: 'sedes', tableTitle: 'Directorio de sedes', key: 'id',
      fields: [
        { name: 'nombre', label: 'Nombre de la sede', type: 'text', required: true, placeholder: 'Ej. Planta Maracaibo', full: true },
        { name: 'tipo', label: 'Tipo de sede', type: 'select', required: true, options: ['Planta de Producción', 'Centro de Distribución', 'Oficina Administrativa'] },
        { name: 'estado', label: 'Estado', type: 'select', required: true, options: ['Activa', 'Inactiva'], default: 'Activa' },
        { name: 'direccion', label: 'Dirección exacta / sector', type: 'textarea', required: true, placeholder: 'Dirección, sector, municipio…', full: true },
        { name: 'capacidad', label: 'Capacidad máxima de personal', type: 'number', required: true, min: 1, placeholder: 'Ej. 250' },
        { name: 'telefono', label: 'Teléfono de contacto principal', type: 'tel', required: true, placeholder: '+58 261 000 0000' }
      ],
      columns: [{label:'Código',value:r=>r.id},{label:'Sede',value:r=>r.nombre,sub:r=>r.tipo},{label:'Dirección',value:r=>r.direccion},{label:'Capacidad',value:r=>`${r.capacidad} personas`},{label:'Teléfono',value:r=>r.telefono},{label:'Estado',value:r=>r.estado,badge:true}]
    },
    trabajadores: {
      title: 'Trabajadores', eyebrow: 'GESTIÓN DE PERSONAL', description: 'Consulta y administra el directorio de personal asignado a cada sede.', singular: 'trabajador', plural: 'trabajadores', tableTitle: 'Directorio de trabajadores', key: 'cedula',
      fields: [
        { name: 'cedula', label: 'Cédula / DNI', type: 'text', required: true, placeholder: 'Ej. V-12345678', hint: 'Identificador único del trabajador.' },
        { name: 'nombre', label: 'Nombres y apellidos', type: 'text', required: true, placeholder: 'Nombre completo' },
        { name: 'correo', label: 'Correo corporativo', type: 'email', required: true, placeholder: 'nombre@kof.com.mx' },
        { name: 'telefono', label: 'Teléfono de contacto', type: 'tel', required: true, placeholder: '+58 412 000 0000' },
        { name: 'cargo', label: 'Cargo / rol', type: 'select', required: true, options: ['Operador de Línea', 'Supervisor de Calidad', 'Conductor', 'Administrativo', 'Seguridad', 'Técnico de Mantenimiento', 'Otro'] },
        { name: 'departamento', label: 'Departamento', type: 'select', required: true, options: ['Producción', 'Logística', 'Mantenimiento', 'Recursos Humanos', 'Seguridad'] },
        { name: 'sedeId', label: 'Sede asignada', type: 'select', required: true, relation: 'sedes', empty: 'Selecciona una sede' },
        { name: 'estado', label: 'Estado laboral', type: 'select', required: true, options: ['Activo', 'Vacaciones', 'Suspendido', 'Inactivo'], default: 'Activo' },
        { name: 'fechaIngreso', label: 'Fecha de ingreso', type: 'date', required: true }
      ],
      columns: [{label:'Trabajador',value:r=>r.nombre,sub:r=>r.cedula},{label:'Cargo',value:r=>r.cargo,sub:r=>r.departamento},{label:'Correo',value:r=>r.correo},{label:'Sede',value:r=>siteName(r.sedeId)},{label:'Ingreso',value:r=>formatDate(r.fechaIngreso)},{label:'Estado',value:r=>r.estado,badge:true}]
    },
    asistencia: {
      title: 'Asistencia', eyebrow: 'CONTROL DE MARCAJES', description: 'Registra y consulta las entradas, salidas y eventos de turno.', singular: 'marcaje', plural: 'marcajes', tableTitle: 'Registro de asistencia', key: 'id',
      fields: [
        { name: 'trabajadorId', label: 'Trabajador', type: 'select', required: true, relation: 'trabajadores', empty: 'Selecciona un trabajador' },
        { name: 'fechaHora', label: 'Fecha y hora de registro', type: 'datetime-local', required: true },
        { name: 'evento', label: 'Tipo de evento', type: 'select', required: true, options: ['Entrada Turno', 'Salida Almuerzo', 'Entrada Almuerzo', 'Salida Turno'] },
        { name: 'sedeId', label: 'Sede donde marca', type: 'select', required: true, relation: 'sedes', empty: 'Selecciona una sede' },
        { name: 'estado', label: 'Estado / observación', type: 'select', required: true, options: ['A Tiempo', 'Retardo', 'Hora Extra', 'Permiso Médico'], default: 'A Tiempo' },
        { name: 'observacion', label: 'Detalle (opcional)', type: 'textarea', placeholder: 'Agrega información relevante…', full: true }
      ],
      columns: [{label:'Trabajador',value:r=>workerName(r.trabajadorId),sub:r=>r.trabajadorId},{label:'Fecha y hora',value:r=>formatDateTime(r.fechaHora)},{label:'Evento',value:r=>r.evento},{label:'Sede',value:r=>siteName(r.sedeId)},{label:'Estado',value:r=>r.estado,badge:true}]
    },
    accesos: {
      title: 'Accesos y vehículos', eyebrow: 'CONTROL DE MOVILIDAD', description: 'Controla las entradas, salidas y novedades de vehículos en la planta.', singular: 'acceso', plural: 'accesos', tableTitle: 'Registro de accesos', key: 'id',
      fields: [
        { name: 'placa', label: 'Placa del vehículo', type: 'text', required: true, placeholder: 'Ej. A12BC3D', upper: true },
        { name: 'tipoVehiculo', label: 'Tipo de vehículo', type: 'select', required: true, options: ['Camión de Reparto / Distribución', 'Vehículo Particular de Empleado', 'Transporte Externo / Contratista', 'Montacargas'] },
        { name: 'responsableTipo', label: 'Tipo de responsable', type: 'select', required: true, options: ['Trabajador', 'Visitante / Contratista'], default: 'Trabajador' },
        { name: 'trabajadorId', label: 'Trabajador responsable', type: 'select', required: true, relation: 'trabajadores', empty: 'Selecciona un trabajador', visibleWhen: {field:'responsableTipo',value:'Trabajador'} },
        { name: 'visitanteNombre', label: 'Nombre del visitante', type: 'text', required: true, placeholder: 'Nombre y apellido', visibleWhen: {field:'responsableTipo',value:'Visitante / Contratista'} },
        { name: 'visitanteCedula', label: 'Cédula / DNI del visitante', type: 'text', required: true, placeholder: 'Identificación', visibleWhen: {field:'responsableTipo',value:'Visitante / Contratista'} },
        { name: 'movimiento', label: 'Tipo de movimiento', type: 'select', required: true, options: ['Entrada', 'Salida'] },
        { name: 'fechaHora', label: 'Fecha y hora de acceso', type: 'datetime-local', required: true },
        { name: 'zona', label: 'Puesto / zona', type: 'select', required: true, options: ['Zona A - Carga', 'Zona B - Empleados', 'Zona C - Visitantes', 'Zona D - Operaciones'] },
        { name: 'sedeId', label: 'Sede', type: 'select', required: true, relation: 'sedes', empty: 'Selecciona una sede' },
        { name: 'novedades', label: 'Novedades / estado del vehículo', type: 'textarea', placeholder: 'Observaciones del vehículo o del acceso…', full: true }
      ],
      columns: [{label:'Vehículo',value:r=>r.placa,sub:r=>r.tipoVehiculo},{label:'Responsable',value:r=>r.responsableTipo==='Trabajador'?workerName(r.trabajadorId):r.visitanteNombre,sub:r=>r.responsableTipo==='Trabajador'?r.trabajadorId:`Visitante · ${r.visitanteCedula}`},{label:'Movimiento',value:r=>r.movimiento,movement:true},{label:'Fecha y hora',value:r=>formatDateTime(r.fechaHora)},{label:'Zona',value:r=>r.zona},{label:'Sede',value:r=>siteName(r.sedeId)}]
    }
  };

  const localKey = 'kof-maracaibo-erp-v1';
  const state = { activePage: 'overview', records: { sedes: [], trabajadores: [], asistencia: [], accesos: [] }, search: '', user: null };
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function defaultData() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    return { sedes: [{id:'SED-001',nombre:'Planta Maracaibo',tipo:'Planta de Producción',direccion:'Zona Industrial, Av. 17, Maracaibo, estado Zulia',estado:'Activa',capacidad:350,telefono:'+58 261 700 0000'}], trabajadores: [], asistencia: [], accesos: [] };
  }

  const storage = {
    async list(module) {
      if (location.protocol !== 'file:') {
        try {
          const response = await fetch(`/api/${module}`);
          if (!response.ok) throw new Error(`API ${response.status}`);
          return await response.json();
        } catch (error) {
          if (error instanceof TypeError) throw new Error('No se pudo conectar con la API. Inicia el servidor local para cargar los registros.');
          throw error;
        }
      }
      const saved = JSON.parse(localStorage.getItem(localKey) || 'null') || defaultData();
      state.records = saved;
      return saved[module] || [];
    },
    async create(module, record) {
      if (location.protocol !== 'file:') {
        const response = await fetch(`/api/${module}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(record) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el registro.');
        return payload;
      }
      const all = JSON.parse(localStorage.getItem(localKey) || 'null') || defaultData();
      if (module === 'trabajadores' && all.trabajadores.some(row => row.cedula.toLowerCase() === record.cedula.toLowerCase())) throw new Error('Ya existe un trabajador con esa cédula.');
      record.id = record.id || nextId(module, all[module]);
      all[module].push(record);
      localStorage.setItem(localKey, JSON.stringify(all));
      return record;
    }
  };

  function nextId(module, records) {
    const prefix = { sedes:'SED', trabajadores:'TRB', asistencia:'ASI', accesos:'ACC' }[module];
    return `${prefix}-${String(records.length + 1).padStart(3,'0')}`;
  }
  function formatDate(value) {
    if (!value) return '—';
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('es-VE',{day:'2-digit',month:'short',year:'numeric'}).format(parsed);
  }
  function localDateValue(date = new Date()) {
    const year=date.getFullYear();
    const month=String(date.getMonth()+1).padStart(2,'0');
    const day=String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  }
  function formatDateTime(value) {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('es-VE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(parsed);
  }
  function siteName(id) { return state.records.sedes.find(item => item.id === id)?.nombre || '—'; }
  function workerName(id) { return state.records.trabajadores.find(item => item.cedula === id)?.nombre || '—'; }

  async function refreshModule(module) {
    try { state.records[module] = await storage.list(module); }
    catch (error) { showToast(error.message); }
  }
  async function refreshAll() {
    for (const module of Object.keys(modules)) await refreshModule(module);
    renderDashboard();
    if (modules[state.activePage]) renderModule(state.activePage);
    updateCounts();
  }
  function updateCounts() {
    Object.keys(modules).forEach(key => {
      const navCount = document.querySelector(`[data-count="${key}"]`);
      if (navCount) navCount.textContent = state.records[key].length;
      const stat = document.querySelector(`[data-stat="${key}"]`);
      if (stat) stat.textContent = state.records[key].length;
    });
  }
  function renderDashboard() {
    updateCounts();
    const all = Object.entries(state.records).flatMap(([module, rows]) => rows.map(row => ({module,row,when:row.fechaHora || row.fechaIngreso || ''}))).sort((a,b)=>b.when.localeCompare(a.when)).slice(0,4);
    const list = $('#recent-activity');
    if (!all.length) { list.innerHTML = '<div class="no-activity">Aún no hay actividad. Los nuevos registros aparecerán aquí.</div>'; return; }
    list.innerHTML = all.map(({module,row,when}) => {
      const info = module==='trabajadores' ? `Nuevo trabajador · ${esc(row.cedula)}` : module==='sedes' ? `Sede registrada · ${esc(row.tipo)}` : module==='asistencia' ? `${esc(row.evento)} · ${esc(workerName(row.trabajadorId))}` : `${esc(row.movimiento)} · ${esc(row.placa)}`;
      const title = module==='trabajadores' ? row.nombre : module==='sedes' ? row.nombre : module==='asistencia' ? workerName(row.trabajadorId) : row.placa;
      const icon = module==='trabajadores'?'♙':module==='sedes'?'⌖':module==='asistencia'?'◷':'⇄';
      return `<div class="activity-item"><span class="activity-icon">${icon}</span><div class="activity-copy"><strong>${esc(title)}</strong><small>${info}</small></div><span class="activity-time">${when ? esc(formatDateTime(when)) : 'Hoy'}</span></div>`;
    }).join('');
  }
  function setPage(page) {
    state.activePage = page;
    document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === page));
    $('#overview-page').classList.toggle('hidden', page !== 'overview');
    $('#module-page').classList.toggle('hidden', page === 'overview');
    $('#breadcrumb-current').textContent = page === 'overview' ? 'Resumen general' : modules[page].title;
    $('#sidebar').classList.remove('open');
    if (modules[page]) { state.search = ''; $('#table-search').value=''; renderModule(page); }
  }
  function renderModule(module) {
    const config = modules[module];
    if (!config) return;
    $('#module-eyebrow').textContent = config.eyebrow;
    $('#module-title').textContent = config.title;
    $('#module-description').textContent = config.description;
    $('#table-title').textContent = config.tableTitle;
    const rows = state.records[module] || [];
    const active = rows.filter(r => !['Inactiva','Inactivo','Suspendido'].includes(r.estado)).length;
    $('#module-summary').innerHTML = `<div class="summary-chip"><strong>${rows.length}</strong> ${rows.length===1?config.singular:config.plural} registrados</div><div class="summary-chip"><i></i><strong>${active}</strong> activos</div>`;
    $('#table-head').innerHTML = `<tr>${config.columns.map(col=>`<th>${esc(col.label)}</th>`).join('')}</tr>`;
    const filtered = rows.filter(row => JSON.stringify(row).toLowerCase().includes(state.search.toLowerCase()));
    $('#result-count').textContent = `${filtered.length} ${filtered.length===1?'registro':'registros'}`;
    $('#table-footer-count').textContent = `Mostrando ${filtered.length} de ${rows.length} registros`;
    const body = $('#table-body');
    body.innerHTML = '';
    filtered.forEach(row => {
      const tr = document.createElement('tr');
      config.columns.forEach(col => {
        const td = document.createElement('td');
        const value = col.value(row);
        if (col.badge) td.innerHTML = `<span class="status-badge status-${esc(String(value).toLowerCase().replaceAll(' ','-'))}">${esc(value)}</span>`;
        else if (col.movement) td.innerHTML = `<span class="${value==='Entrada'?'movement-entry':'movement-exit'}">${esc(value==='Entrada'?'↘':'↗')} ${esc(value)}</span>`;
        else if (col.sub) td.innerHTML = `<div class="cell-main">${esc(value)}</div><div class="cell-sub">${esc(col.sub(row))}</div>`;
        else td.textContent = value ?? '—';
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    const empty = $('#empty-state');
    empty.classList.toggle('hidden', filtered.length > 0);
    $('#table-head').parentElement.classList.toggle('hidden', filtered.length === 0);
    if (rows.length && !filtered.length) { $('#empty-title').textContent='No encontramos resultados'; $('#empty-description').textContent='Prueba con otro nombre, código o término de búsqueda.'; empty.querySelector('[data-empty-create]').classList.add('hidden'); }
    else { $('#empty-title').textContent='Aún no hay registros'; $('#empty-description').textContent=`Crea el primer registro de ${config.plural} para empezar.`; empty.querySelector('[data-empty-create]').classList.remove('hidden'); }
  }

  function openModal(module) {
    const config = modules[module];
    if (!config) return;
    if ((module==='trabajadores' || module==='asistencia' || module==='accesos') && state.records.sedes.length===0) { showToast('Registra una sede antes de continuar.'); setPage('sedes'); return; }
    if ((module==='asistencia' || module==='accesos') && state.records.trabajadores.length===0 && module==='asistencia') { showToast('Registra un trabajador antes de crear marcajes.'); setPage('trabajadores'); return; }
    $('#modal-title').textContent = `Registrar ${config.singular}`;
    $('#modal-description').textContent = `Completa los campos para agregar ${config.singular} al sistema.`;
    $('#form-error').classList.add('hidden');
    const formFields = $('#form-fields');
    formFields.innerHTML = config.fields.map(field => buildField(field)).join('');
    formFields.dataset.module = module;
    const now = new Date();
    const localDateTime = new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
    const dateInput = formFields.querySelector('[name="fechaHora"]');
    if (dateInput) dateInput.value = localDateTime;
    const todayInput = formFields.querySelector('[name="fechaIngreso"]');
    if (todayInput) todayInput.value = localDateValue();
    formFields.querySelectorAll('select').forEach(select=>{ if (select.dataset.default) select.value=select.dataset.default; });
    formFields.querySelectorAll('[data-visible-if]').forEach(updateConditionalField);
    $('#modal-backdrop').classList.remove('hidden');
    document.body.style.overflow='hidden';
    const first = formFields.querySelector('input:not([type="hidden"]),select,textarea');
    if (first) first.focus();
  }
  function buildField(field) {
    const required = field.required ? 'required' : '';
    const requiredLabel = field.required ? ' <span>*</span>' : '';
    const full = field.full ? ' field-full' : '';
    let control='';
    if (field.type==='select') {
      const options = field.relation ? relationOptions(field) : field.options.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
      control = `<select id="field-${field.name}" name="${field.name}" ${required} ${field.default?`data-default="${esc(field.default)}"`:''}>${field.empty?`<option value="">${esc(field.empty)}</option>`:''}${options}</select>`;
    } else if (field.type==='textarea') control = `<textarea id="field-${field.name}" name="${field.name}" ${required} placeholder="${esc(field.placeholder||'')}"></textarea>`;
    else control = `<input id="field-${field.name}" name="${field.name}" type="${field.type}" ${required} ${field.min?`min="${field.min}"`:''} ${field.placeholder?`placeholder="${esc(field.placeholder)}"`:''} ${field.upper?'style="text-transform:uppercase"':''}>`;
    const visibility = field.visibleWhen ? ` data-visible-if="${field.visibleWhen.field}" data-visible-value="${esc(field.visibleWhen.value)}"` : '';
    return `<div class="field${full}"${visibility}><label for="field-${field.name}">${esc(field.label)}${requiredLabel}</label>${control}${field.hint?`<small class="field-hint">${esc(field.hint)}</small>`:''}</div>`;
  }
  function relationOptions(field) {
    const list = state.records[field.relation] || [];
    return list.map(record => {
      const value = field.relation==='trabajadores' ? record.cedula : record.id;
      const label = field.relation==='trabajadores' ? `${record.nombre} · ${record.cedula}` : `${record.nombre} · ${record.id}`;
      return `<option value="${esc(value)}">${esc(label)}</option>`;
    }).join('');
  }
  function updateConditionalField(field) {
    const selector = `[name="${field.dataset.visibleIf}"]`;
    const controller = field.closest('form').querySelector(selector);
    const visible = controller && controller.value === field.dataset.visibleValue;
    field.classList.toggle('hidden', !visible);
    field.querySelector('input,select,textarea').disabled = !visible;
  }
  function closeModal() { $('#modal-backdrop').classList.add('hidden'); document.body.style.overflow=''; $('#record-form').reset(); }
  function formToRecord(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.placa) data.placa = data.placa.trim().toUpperCase();
    if (data.cedula) data.cedula = data.cedula.trim();
    if (data.capacidad) data.capacidad = Number(data.capacidad);
    if (data.fechaHora) data.fechaHora = new Date(data.fechaHora).toISOString();
    if (data.trabajadorId && data.responsableTipo==='Visitante / Contratista') delete data.trabajadorId;
    if (data.responsableTipo==='Trabajador') { delete data.visitanteNombre; delete data.visitanteCedula; }
    Object.keys(data).forEach(key => { if (typeof data[key]==='string') data[key]=data[key].trim(); });
    return data;
  }
  async function submitForm(event) {
    event.preventDefault();
    const form=event.currentTarget;
    const fields=$('#form-fields');
    const module=fields.dataset.module;
    if (!form.reportValidity()) return;
    const record=formToRecord(form);
    try {
      if (module==='trabajadores' && state.records.trabajadores.some(item=>item.cedula.toLowerCase()===record.cedula.toLowerCase())) throw new Error('Ya existe un trabajador con esa cédula.');
      await storage.create(module,record);
      await refreshModule(module);
      if (module==='sedes') await refreshModule('sedes');
      closeModal();
      renderModule(module);
      renderDashboard();
      updateCounts();
      showToast(`${modules[module].singular[0].toUpperCase()+modules[module].singular.slice(1)} guardado correctamente.`);
    } catch(error) {
      $('#form-error').textContent=error.message;
      $('#form-error').classList.remove('hidden');
    }
  }
  let toastTimer;
  function showToast(message) {
    const toast=$('#toast');toast.textContent=message;toast.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),3200);
  }
  function initTheme() {
    const saved=localStorage.getItem('kof-theme');
    if(saved==='dark') document.body.classList.add('dark');
    $('#theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('kof-theme',document.body.classList.contains('dark')?'dark':'light');});
  }
  function setLoginError(message) {
    const error=$('#login-error');
    error.textContent=message;
    error.classList.toggle('hidden',!message);
  }
  function updateGuardSelector() {
    const isGuard=$('#login-role').value==='guardia';
    const field=$('#login-guard-field');
    const select=$('#login-guard');
    field.classList.toggle('hidden',!isGuard);
    select.disabled=!isGuard;
    select.required=isGuard;
    if(!isGuard) select.value='';
  }
  function showLogin(message='') {
    document.body.classList.add('auth-pending');
    $('#login-screen').classList.remove('hidden');
    setLoginError(message);
    if(message) $('#login-email').focus();
  }
  function showApp(user) {
    state.user=user;
    const name=String(user.name||'Usuario').trim();
    const initials=name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
    const roleText=user.role==='guardia'?`Guardia de turno · Guardia ${user.guard}`:'Encargado · Administrador';
    document.querySelectorAll('[data-user-name]').forEach(element=>element.textContent=name);
    document.querySelectorAll('[data-user-role]').forEach(element=>element.textContent=roleText);
    document.querySelectorAll('[data-user-avatar]').forEach(element=>element.textContent=initials);
    $('[data-welcome-name]').textContent=name.split(/\s+/)[0];
    const isGuard=user.role==='guardia';
    document.querySelectorAll('[data-page="overview"],[data-page="sedes"],[data-page="trabajadores"],[data-create="trabajadores"]').forEach(element=>element.classList.toggle('hidden',isGuard));
    $('#login-screen').classList.add('hidden');
    document.body.classList.remove('auth-pending');
    if(user.role==='guardia') setPage('accesos');
    else setPage('overview');
  }
  async function submitLogin(event) {
    event.preventDefault();
    const form=event.currentTarget;
    if(!form.reportValidity()) return;
    const button=$('#login-submit');
    button.disabled=true;
    button.firstChild.textContent='Verificando acceso… ';
    setLoginError('');
    const credentials=Object.fromEntries(new FormData(form).entries());
    try {
      const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'No se pudo iniciar sesión.');
      window.location.assign(payload.redirectTo||'/');
    } catch(error) {
      setLoginError(error.message||'No se pudo conectar con el servidor.');
      button.disabled=false;
      button.firstChild.textContent='Entrar a la plataforma ';
    }
  }
  async function logout() {
    try {
      const response=await fetch('/api/logout',{method:'POST'});
      if(!response.ok) throw new Error('No se pudo cerrar la sesión.');
      window.location.assign('/');
    } catch(error) { showToast(error.message); }
  }
  async function init() {
    const initial=defaultData();
    if(location.protocol==='file:') {
      try { state.records=JSON.parse(localStorage.getItem(localKey) || 'null') || initial; }
      catch { state.records=initial; }
      if(!state.records.sedes?.length && !localStorage.getItem(localKey)) localStorage.setItem(localKey,JSON.stringify(state.records));
    }
    $('#today-label').textContent=new Intl.DateTimeFormat('es-VE',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date());
    document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>setPage(button.dataset.page)));
    document.querySelectorAll('[data-create]').forEach(button=>button.addEventListener('click',()=>openModal(button.dataset.create)));
    $('#add-record').addEventListener('click',()=>openModal(state.activePage));
    $('[data-empty-create]').addEventListener('click',()=>openModal(state.activePage));
    $('#table-search').addEventListener('input',event=>{state.search=event.target.value;renderModule(state.activePage);});
    $('#refresh-data').addEventListener('click',refreshAll);
    $('#record-form').addEventListener('submit',submitForm);
    $('#cancel-modal').addEventListener('click',closeModal);
    $('#modal-close').addEventListener('click',closeModal);
    $('#modal-backdrop').addEventListener('click',event=>{if(event.target.id==='modal-backdrop')closeModal();});
    $('#mobile-menu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
    $('#form-fields').addEventListener('change',event=>{if(event.target.name==='responsableTipo') $('#form-fields').querySelectorAll('[data-visible-if]').forEach(updateConditionalField);});
    $('#login-role').addEventListener('change',updateGuardSelector);
    $('#login-form').addEventListener('submit',submitLogin);
    $('#logout-button').addEventListener('click',logout);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#modal-backdrop').classList.contains('hidden'))closeModal();});
    initTheme();
    updateGuardSelector();
    if(location.protocol==='file:') {
      document.body.classList.remove('auth-pending');
      renderDashboard();
      updateCounts();
      return;
    }
    try {
      const response=await fetch('/api/session');
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'No se pudo verificar la sesión.');
      if(!payload.authenticated) { showLogin(); return; }
      const user=payload.user;
      const guardInUrl=new URLSearchParams(location.search).get('guardia');
      if(user.role==='guardia'&&guardInUrl!==user.guard) {
        window.location.replace(`/?guardia=${encodeURIComponent(user.guard)}`);
        return;
      }
      if(user.role!=='guardia'&&guardInUrl) window.history.replaceState(null,'','/');
      showApp(user);
      await refreshAll();
    } catch(error) { showLogin(error.message||'No se pudo conectar con el servidor.'); }
  }
  init();
})();
