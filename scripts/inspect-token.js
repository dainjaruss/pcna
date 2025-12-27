#!/usr/bin/env node
const fs = require('fs');

const cookiePath = process.argv[2] || '/tmp/smoke_cookies';
if (!fs.existsSync(cookiePath)) {
  console.error('cookie file not found:', cookiePath);
  process.exit(2);
}

const raw = fs.readFileSync(cookiePath, 'utf8');
const lines = raw.split(/\r?\n/).filter(Boolean);

let accessToken = null;
for (let ln of lines) {
  if (ln.startsWith('#HttpOnly_')) ln = ln.replace('#HttpOnly_', '');
  if (ln.startsWith('#')) continue;
  const parts = ln.split(/\s+/);
  if (parts.length < 7) continue;
  const name = parts[5];
  const value = parts.slice(6).join(' ');
  if (name === 'access_token') {
    accessToken = value.trim();
    break;
  }
}

if (!accessToken) {
  console.error('access_token not found in cookie jar');
  process.exit(3);
}

const payload = accessToken.split('.')[1];
if (!payload) {
  console.error('invalid jwt');
  process.exit(4);
}

function base64urlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4 !== 0) input += '=';
  return Buffer.from(input, 'base64').toString('utf8');
}

try {
  const decoded = base64urlDecode(payload);
  const json = JSON.parse(decoded);
  console.log(JSON.stringify(json, null, 2));
} catch (err) {
  console.error('failed to decode token payload:', err.message);
  process.exit(5);
}
