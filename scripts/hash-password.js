'use strict';

const crypto = require('node:crypto');

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
      reject(new Error('Ejecuta este comando desde una terminal interactiva.'));
      return;
    }
    let value = '';
    const finish = (error) => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = chunk => {
      for (const character of chunk) {
        if (character === '\u0003') {
          finish(new Error('Operación cancelada.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u007f' || character === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        value += character;
        process.stdout.write('*');
      }
    };
    process.stdout.write(prompt);
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

async function main() {
  const password = await readHidden('Contraseña nueva: ');
  const confirmation = await readHidden('Confirma la contraseña: ');
  if (password.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres.');
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
  const salt = crypto.randomBytes(32);
  const hash = crypto.scryptSync(password, salt, 64);
  console.log(`Hash para auth-users.json:\nscrypt$${salt.toString('hex')}$${hash.toString('hex')}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
