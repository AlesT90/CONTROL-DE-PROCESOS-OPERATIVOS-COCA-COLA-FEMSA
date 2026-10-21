'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { after, before, test } = require('node:test');

const root = path.resolve(__dirname, '..');
let server;
let baseUrl;
let tempDir;
let serverOutput = '';

async function freePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => listener.listen(0, '127.0.0.1', resolve).once('error', reject));
  const { port } = listener.address();
  await new Promise(resolve => listener.close(resolve));
  return port;
}

function account(id, name, email, role, guard) {
  const salt = crypto.randomBytes(32);
  const hash = crypto.scryptSync('test-password-123', salt, 64);
  return {
    id,
    name,
    email,
    role,
    ...(guard ? { guard } : {}),
    passwordHash: `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
  };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`El servidor terminó: ${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`El servidor no inició a tiempo: ${serverOutput}`);
}

before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kof-auth-test-'));
  const usersFile = path.join(tempDir, 'users.json');
  const users = [
    account('admin-1', 'Administrador de prueba', 'admin@test.invalid', 'encargado'),
    account('guard-a', 'Guardia A de prueba', 'guard-a@test.invalid', 'guardia', 'A')
  ];
  await fs.writeFile(usersFile, JSON.stringify(users));
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), KOF_USERS_FILE: usersFile },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => { serverOutput += chunk; });
  server.stderr.on('data', chunk => { serverOutput += chunk; });
  await waitForServer();
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise(resolve => server.once('exit', resolve));
  }
  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
});

test('protege los módulos y rechaza la selección de una guardia ajena', async () => {
  const privateResponse = await fetch(`${baseUrl}/api/sedes`);
  assert.equal(privateResponse.status, 401);

  const mismatch = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'guard-a@test.invalid', password: 'test-password-123', role: 'guardia', guard: 'B' })
  });
  assert.equal(mismatch.status, 401);
});

test('una guardia accede a operaciones pero no modifica cuentas maestras', async () => {
  const response = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'guard-a@test.invalid', password: 'test-password-123', role: 'guardia', guard: 'A' })
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.user.guard, 'A');
  assert.equal(payload.redirectTo, '/?guardia=A');
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);

  const records = await fetch(`${baseUrl}/api/accesos`, { headers: { Cookie: cookie } });
  assert.equal(records.status, 200);

  const forbidden = await fetch(`${baseUrl}/api/sedes`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(forbidden.status, 403);

  const logout = await fetch(`${baseUrl}/api/logout`, { method: 'POST', headers: { Cookie: cookie } });
  assert.equal(logout.status, 200);
  const afterLogout = await fetch(`${baseUrl}/api/accesos`, { headers: { Cookie: cookie } });
  assert.equal(afterLogout.status, 401);
});

test('el encargado puede consultar los módulos y los datos de configuración no son públicos', async () => {
  const response = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.invalid', password: 'test-password-123', role: 'encargado' })
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  const records = await fetch(`${baseUrl}/api/sedes`, { headers: { Cookie: cookie } });
  assert.equal(records.status, 200);

  const privateFile = await fetch(`${baseUrl}/data/erp.json`);
  assert.equal(privateFile.status, 404);
});
