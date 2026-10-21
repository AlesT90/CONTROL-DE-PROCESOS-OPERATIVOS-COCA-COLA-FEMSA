'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'erp.json');
const USERS_FILE = process.env.KOF_USERS_FILE || path.join(DATA_DIR, 'auth-users.json');
const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const GUARDS = ['A', 'B', 'C', 'D'];
const MODULES = ['sedes', 'trabajadores', 'asistencia', 'accesos'];
const PREFIX = { sedes:'SED', trabajadores:'TRB', asistencia:'ASI', accesos:'ACC' };
const ENUMS = {
  tipoSede: ['Planta de Producción','Centro de Distribución','Oficina Administrativa'],
  estadoSede: ['Activa','Inactiva'],
  cargo: ['Operador de Línea','Supervisor de Calidad','Conductor','Administrativo','Seguridad','Técnico de Mantenimiento','Otro'],
  departamento: ['Producción','Logística','Mantenimiento','Recursos Humanos','Seguridad'],
  estadoLaboral: ['Activo','Vacaciones','Suspendido','Inactivo'],
  evento: ['Entrada Turno','Salida Almuerzo','Entrada Almuerzo','Salida Turno'],
  estadoAsistencia: ['A Tiempo','Retardo','Hora Extra','Permiso Médico'],
  tipoVehiculo: ['Camión de Reparto / Distribución','Vehículo Particular de Empleado','Transporte Externo / Contratista','Montacargas'],
  movimiento: ['Entrada','Salida'],
  zona: ['Zona A - Carga','Zona B - Empleados','Zona C - Visitantes','Zona D - Operaciones']
};

function initialData() {
  return { sedes:[{id:'SED-001',nombre:'Planta Maracaibo',tipo:'Planta de Producción',direccion:'Zona Industrial, Av. 17, Maracaibo, estado Zulia',estado:'Activa',capacidad:350,telefono:'+58 261 700 0000'}], trabajadores:[], asistencia:[], accesos:[] };
}
function ensureStore() {
  fs.mkdirSync(DATA_DIR,{recursive:true});
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE,JSON.stringify(initialData(),null,2));
}
function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
}
function writeStore(data) {
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp,JSON.stringify(data,null,2));
  fs.renameSync(temp,DATA_FILE);
}
function send(res,status,payload,contentType='application/json; charset=utf-8') {
  res.writeHead(status,{'Content-Type':contentType,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
  res.end(contentType.startsWith('application/json') ? JSON.stringify(payload) : payload);
}
function error(res,status,message) { send(res,status,{error:message}); }
function required(record,keys) { return keys.filter(key => record[key]===undefined || record[key]===null || String(record[key]).trim()===''); }
function validDate(value) { return typeof value==='string' && !Number.isNaN(Date.parse(value)); }
function validate(module,record,data) {
  if (!record || typeof record!=='object' || Array.isArray(record)) return 'El cuerpo debe ser un objeto JSON.';
  const fields = {
    sedes:['nombre','tipo','direccion','estado','capacidad','telefono'],
    trabajadores:['cedula','nombre','correo','telefono','cargo','departamento','sedeId','estado','fechaIngreso'],
    asistencia:['trabajadorId','fechaHora','evento','sedeId','estado'],
    accesos:['placa','tipoVehiculo','responsableTipo','movimiento','fechaHora','zona','sedeId']
  };
  const missing=required(record,fields[module]);
  if(missing.length) return `Campos obligatorios: ${missing.join(', ')}.`;
  if(module==='sedes') {
    if(!ENUMS.tipoSede.includes(record.tipo)||!ENUMS.estadoSede.includes(record.estado)) return 'Tipo o estado de sede no válido.';
    if(!Number.isInteger(Number(record.capacidad))||Number(record.capacidad)<1) return 'La capacidad debe ser un entero mayor que cero.';
  }
  if(module==='trabajadores') {
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.correo)) return 'El correo electrónico no tiene un formato válido.';
    if(!ENUMS.cargo.includes(record.cargo)||!ENUMS.departamento.includes(record.departamento)||!ENUMS.estadoLaboral.includes(record.estado)) return 'Cargo, departamento o estado laboral no válido.';
    if(!validDate(record.fechaIngreso)) return 'La fecha de ingreso no es válida.';
    if(!data.sedes.some(row=>row.id===record.sedeId)) return 'La sede seleccionada no existe.';
    if(data.trabajadores.some(row=>row.cedula.toLowerCase()===String(record.cedula).trim().toLowerCase())) return 'Ya existe un trabajador con esa cédula.';
  }
  if(module==='asistencia') {
    if(!ENUMS.evento.includes(record.evento)||!ENUMS.estadoAsistencia.includes(record.estado)) return 'Tipo de evento o estado de asistencia no válido.';
    if(!validDate(record.fechaHora)) return 'La fecha y hora de registro no son válidas.';
    if(!data.trabajadores.some(row=>row.cedula===record.trabajadorId)) return 'El trabajador seleccionado no existe.';
    if(!data.sedes.some(row=>row.id===record.sedeId)) return 'La sede seleccionada no existe.';
  }
  if(module==='accesos') {
    if(!ENUMS.tipoVehiculo.includes(record.tipoVehiculo)||!ENUMS.movimiento.includes(record.movimiento)||!ENUMS.zona.includes(record.zona)) return 'Tipo de vehículo, movimiento o zona no válido.';
    if(!['Trabajador','Visitante / Contratista'].includes(record.responsableTipo)) return 'Tipo de responsable no válido.';
    if(record.responsableTipo==='Trabajador'&&!data.trabajadores.some(row=>row.cedula===record.trabajadorId)) return 'El trabajador seleccionado no existe.';
    if(record.responsableTipo==='Visitante / Contratista'&&(!record.visitanteNombre||!record.visitanteCedula)) return 'Ingresa el nombre y documento del visitante.';
    if(!validDate(record.fechaHora)) return 'La fecha y hora de acceso no son válidas.';
    if(!data.sedes.some(row=>row.id===record.sedeId)) return 'La sede seleccionada no existe.';
  }
  return null;
}
function parseBody(req) {
  return new Promise((resolve,reject)=>{
    let body='';
    req.on('data',chunk=>{body+=chunk;if(body.length>1_000_000){reject(new Error('El cuerpo excede el límite permitido.'));req.destroy();}});
    req.on('end',()=>{try{resolve(JSON.parse(body||'{}'));}catch{reject(new Error('JSON inválido.'));}});
    req.on('error',reject);
  });
}
const sessions = new Map();
const loginAttempts = new Map();
const dummySalt = Buffer.alloc(32);
const dummyHash = crypto.scryptSync('invalid-login-attempt', dummySalt, 64);

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const err = new Error('El acceso aún no está configurado. Consulta las instrucciones de configuración.');
    err.statusCode = 503;
    throw err;
  }
  let users;
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    const err = new Error('No se pudo leer la configuración de acceso.');
    err.statusCode = 503;
    throw err;
  }
  if (!Array.isArray(users) || users.length === 0) {
    const err = new Error('No hay cuentas configuradas para iniciar sesión.');
    err.statusCode = 503;
    throw err;
  }
  const emails = new Set();
  for (const user of users) {
    const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
    const validHash = typeof user?.passwordHash === 'string' && /^scrypt\$[a-f0-9]{64}\$[a-f0-9]{128}$/i.test(user.passwordHash);
    const validRole = ['encargado', 'guardia'].includes(user?.role);
    const validGuard = user?.role === 'guardia' ? GUARDS.includes(user.guard) : user?.guard === undefined;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof user.name !== 'string' || !user.name.trim() || !validHash || !validRole || !validGuard || emails.has(email)) {
      const err = new Error('La configuración de cuentas no es válida.');
      err.statusCode = 503;
      throw err;
    }
    emails.add(email);
  }
  return users;
}
function getSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)kof_session=([a-f0-9]{64})(?:;|$)/i);
  if (!match) return null;
  const session = sessions.get(match[1]);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(match[1]);
    return null;
  }
  return session;
}
function setSessionCookie(res, id) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `kof_session=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}${secure}`);
}
function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `kof_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}
function publicUser(user) {
  return {
    id: user.id ?? user.email,
    name: user.name,
    email: user.email.trim().toLowerCase(),
    role: user.role,
    ...(user.role === 'guardia' ? { guard: user.guard } : {})
  };
}
function checkLoginLimit(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return false;
  if (record.resetAt <= Date.now()) {
    loginAttempts.delete(ip);
    return false;
  }
  return record.count >= MAX_LOGIN_ATTEMPTS;
}
function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || record.resetAt <= now) loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW });
  else record.count += 1;
}
function clearFailedLogins(ip) {
  loginAttempts.delete(ip);
}
function verifyPassword(password, passwordHash) {
  const parts = typeof passwordHash === 'string' ? passwordHash.split('$') : [];
  const valid = parts.length === 3 && parts[0] === 'scrypt' && /^[a-f0-9]{64}$/i.test(parts[1]) && /^[a-f0-9]{128}$/i.test(parts[2]);
  const salt = valid ? Buffer.from(parts[1], 'hex') : dummySalt;
  const expected = valid ? Buffer.from(parts[2], 'hex') : dummyHash;
  const actual = crypto.scryptSync(password, salt, expected.length);
  return valid && crypto.timingSafeEqual(actual, expected);
}
function serveStatic(req,res,pathname) {
  const requestPath=pathname==='/'?'/index.html':pathname;
  let resolved;
  try { resolved = path.resolve(ROOT, `.${decodeURIComponent(requestPath)}`); }
  catch { error(res,400,'Ruta inválida.');return; }
  const relative = path.relative(ROOT, resolved);
  if(relative.startsWith(`..${path.sep}`)||relative==='..'||path.isAbsolute(relative)){error(res,403,'Ruta no permitida.');return;}
  const normalizedRelative=relative.toLowerCase();
  if(normalizedRelative==='data'||normalizedRelative.startsWith(`data${path.sep}`)||relative.split(path.sep).some(part=>part.startsWith('.'))){error(res,404,'Archivo no encontrado.');return;}
  fs.readFile(resolved,(err,contents)=>{
    if(err){error(res,404,'Archivo no encontrado.');return;}
    const ext=path.extname(resolved).toLowerCase();
    const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
    send(res,200,contents,types[ext]||'application/octet-stream');
  });
}
const server=http.createServer(async(req,res)=>{
  let url;
  try{url=new URL(req.url,'http://localhost');}catch{error(res,400,'URL inválida.');return;}
  if(url.pathname==='/api/login'&&req.method==='POST'){
    const ip=req.socket.remoteAddress||'unknown';
    if(checkLoginLimit(ip)){error(res,429,'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.');return;}
    try{
      const input=await parseBody(req);
      const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
      const password=typeof input.password==='string'&&input.password.length<=1024?input.password:'';
      const role=input.role;
      const guard=input.guard;
      if(!email||!password||!['encargado','guardia'].includes(role)||(role==='guardia'&&!GUARDS.includes(guard))||(role==='encargado'&&guard!==undefined&&guard!=='')){
        recordFailedLogin(ip);error(res,401,'Correo, contraseña, rol o guardia incorrectos.');return;
      }
      const users=readUsers();
      const user=users.find(item=>item.email.trim().toLowerCase()===email);
      const passwordValid=verifyPassword(password,user?.passwordHash);
      const roleValid=user?.role===role;
      const guardValid=role==='encargado'||user?.guard===guard;
      if(!user||!passwordValid||!roleValid||!guardValid){
        recordFailedLogin(ip);error(res,401,'Correo, contraseña, rol o guardia incorrectos.');return;
      }
      clearFailedLogins(ip);
      for(const [id,session] of sessions){if(session.expiresAt<=Date.now())sessions.delete(id);}
      const id=crypto.randomBytes(32).toString('hex');
      const account=publicUser(user);
      sessions.set(id,{user:account,expiresAt:Date.now()+SESSION_TTL});
      setSessionCookie(res,id);
      send(res,200,{user:account,redirectTo:user.role==='guardia'?`/?guardia=${encodeURIComponent(user.guard)}`:'/'});
    }catch(err){error(res,err.statusCode||400,err.message||'No se pudo iniciar sesión.');}
    return;
  }
  if(url.pathname==='/api/session'&&req.method==='GET'){
    const session=getSession(req);
    send(res,200,session?{authenticated:true,user:session.user}:{authenticated:false});
    return;
  }
  if(url.pathname==='/api/logout'&&req.method==='POST'){
    const cookie=req.headers.cookie||'';
    const match=cookie.match(/(?:^|;\s*)kof_session=([a-f0-9]{64})(?:;|$)/i);
    if(match)sessions.delete(match[1]);
    clearSessionCookie(res);
    send(res,200,{message:'Sesión cerrada.'});
    return;
  }
  const match=url.pathname.match(/^\/api\/([a-z]+)$/);
  if(url.pathname==='/api/health'&&req.method==='GET'){send(res,200,{status:'ok',service:'KOF Maracaibo ERP'});return;}
  if(!match){serveStatic(req,res,url.pathname);return;}
  const session=getSession(req);
  if(!session){error(res,401,'Inicia sesión para continuar.');return;}
  const module=match[1];
  if(!MODULES.includes(module)){error(res,404,'Módulo no encontrado.');return;}
  if(req.method==='POST'&&session.user.role==='guardia'&&['sedes','trabajadores'].includes(module)){
    error(res,403,'Solo el Encargado puede modificar sedes y trabajadores.');
    return;
  }
  if(req.method==='GET'){
    const data=readStore();
    send(res,200,data[module]);
    return;
  }
  if(req.method==='POST'){
    try{
      const record=await parseBody(req);
      const data=readStore();
      const message=validate(module,record,data);
      if(message){error(res,400,message);return;}
      const created={...record,id:`${PREFIX[module]}-${String(data[module].length+1).padStart(3,'0')}`};
      if(module==='sedes') created.capacidad=Number(created.capacidad);
      data[module].push(created);
      writeStore(data);
      send(res,201,created);
    }catch(err){error(res,400,err.message||'No se pudo procesar la solicitud.');}
    return;
  }
  res.setHeader('Allow','GET, POST');
  error(res,405,'Método no permitido.');
});

ensureStore();
server.listen(PORT,()=>console.log(`ERP KOF Maracaibo disponible en http://localhost:${PORT}`));
