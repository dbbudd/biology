/* =============================================================
   The HTTP shell
   -------------------------------------------------------------
   A plain Node server, no dependencies. It exists so the service
   can be run and tested on a laptop before any Azure subscription
   exists, and so a deployment to App Service or a container is a
   copy-paste rather than a rewrite.

   Routes match exactly what the SPFx customizer already calls:
     POST /requests
     GET  /requests/:id
     POST /requests/:id/corrections
     POST /requests/:id/publish
   ============================================================= */

import http from 'node:http';
import { createGitHubClient, GitHubError } from './github.mjs';
import { createService, ServiceError } from './service.mjs';
import { identify, authorise, AuthError } from './auth.mjs';

const MAX_BODY = 32 * 1024;

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ms-client-principal',
    'Access-Control-Max-Age': '600',
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new ServiceError(413, 'Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new ServiceError(400, 'Body is not valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function route(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'requests') return undefined;

  if (parts.length === 1) return { action: 'create' };
  const id = parts[1];
  if (parts.length === 2) return { action: 'get', id };
  if (parts.length === 3 && parts[2] === 'corrections') return { action: 'correct', id };
  if (parts.length === 3 && parts[2] === 'publish') return { action: 'publish', id };
  return undefined;
}

export function createHttpServer(env = process.env) {
  const github = createGitHubClient({
    api: env.GITHUB_API,
    repo: env.GITHUB_REPO,
    token: env.GITHUB_TOKEN,
  });
  const service = createService({ github, agentAssignee: env.COPILOT_ASSIGNEE });

  return http.createServer(async (req, res) => {
    const cors = corsHeaders(env);
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json', ...cors });
      res.end(body === undefined ? '' : JSON.stringify(body));
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/health') {
      send(200, {
        ok: true,
        repo: env.GITHUB_REPO || null,
        hasToken: Boolean(env.GITHUB_TOKEN),
        agentAssignee: env.COPILOT_ASSIGNEE || null,
        teacherRole: env.TEACHER_ROLE || null,
        devIdentity: Boolean(env.DEV_IDENTITY),
      });
      return;
    }

    const matched = route(url.pathname);
    if (!matched) {
      send(404, { error: 'Not found' });
      return;
    }

    try {
      const actor = authorise(identify(req.headers, env), env);
      const body = req.method === 'POST' ? await readJson(req) : {};

      if (matched.action === 'create' && req.method === 'POST') {
        send(201, await service.createRequest(body, actor));
        return;
      }
      if (matched.action === 'get' && req.method === 'GET') {
        send(200, await service.getRequest(matched.id, actor));
        return;
      }
      if (matched.action === 'correct' && req.method === 'POST') {
        send(200, await service.addCorrection(matched.id, body, actor));
        return;
      }
      if (matched.action === 'publish' && req.method === 'POST') {
        send(200, await service.publish(matched.id, body, actor));
        return;
      }
      send(405, { error: 'Method not allowed' });
    } catch (err) {
      if (err instanceof AuthError || err instanceof ServiceError) {
        send(err.status, { error: err.message });
        return;
      }
      if (err instanceof GitHubError) {
        // Surface the status the teacher can act on, not the raw payload.
        const message = err.status === 404 ? 'That request does not exist'
          : err.status === 401 || err.status === 403 ? 'The change service is not authorised to reach GitHub'
          : 'GitHub rejected the request';
        console.error('[change-service]', err.message, err.body ? JSON.stringify(err.body).slice(0, 400) : '');
        send(502, { error: message });
        return;
      }
      console.error('[change-service] unhandled', err);
      send(500, { error: 'Something went wrong' });
    }
  });
}

/* Run directly: node server/http.mjs */
const isMain = process.argv[1] && process.argv[1].endsWith('http.mjs');
if (isMain) {
  const port = Number(process.env.PORT || 7071);
  createHttpServer().listen(port, () => {
    console.log(`change service listening on http://localhost:${port}`);
    if (!process.env.GITHUB_TOKEN) console.log('  warning: GITHUB_TOKEN is not set — every write will fail');
    if (!process.env.DEV_IDENTITY) console.log('  note: no DEV_IDENTITY, so requests need a real Entra principal');
  });
}
