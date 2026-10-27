/* =============================================================
   Tests — no network, no GitHub, no Azure
   -------------------------------------------------------------
   A fake GitHub client records what the service asked for and
   returns canned responses. That is enough to pin down the things
   that would be expensive to get wrong in production:

     - the issue body keeps the exact headings every parser reads
     - the teacher's correction is passed through verbatim
     - publishing dispatches the commit the PR currently points at
     - the approver comes from the caller, never from the body
     - nothing can be published twice, or published with no draft

   Run: node --test server/test
   ============================================================= */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createService, ServiceError, summariseDraft } from '../service.mjs';
import { identify, authorise, AuthError } from '../auth.mjs';

function fakeGitHub(overrides = {}) {
  const calls = [];
  const state = {
    issueNumber: 42,
    draft: { number: 7, headSha: 'abc123', merged: false, title: 'Draft', url: 'u' },
    ...overrides,
  };

  return {
    calls,
    state,
    async createRequest(input) {
      calls.push(['createRequest', input]);
      return { number: state.issueNumber, url: 'https://github.com/x/y/issues/42', title: 't' };
    },
    buildIssueBody({ chapter, change, doneWhen }) {
      calls.push(['buildIssueBody', { chapter, change, doneWhen }]);
      return [
        '### Which chapter or section?', chapter, '',
        '### What should change?', change, '',
        '### How will we know it is right?', doneWhen || 'Not specified.',
      ].join('\n');
    },
    async assignAgent(issue, assignee) {
      calls.push(['assignAgent', issue, assignee]);
      return { assigned: assignee };
    },
    async getIssue() {
      return { number: state.issueNumber, state: 'open', title: '[change] 2.3', body: '' };
    },
    async getComments() {
      return [{ body: '<!-- draft-ready -->\n**Draft ready.**\n\nShortened two paragraphs.' }];
    },
    async findDraft() {
      return state.draft;
    },
    async commentOnThread(number, body) {
      calls.push(['commentOnThread', number, body]);
      return { url: 'u' };
    },
    async dispatchPublish(input) {
      calls.push(['dispatchPublish', input]);
      return { dispatched: true, headSha: input.headSha };
    },
  };
}

const teacher = { id: 't1', name: 'Ms Lee', email: 'lee@hkis.edu.hk', roles: ['Teacher'], source: 'dev' };

test('creating a request keeps the headings every parser depends on', async () => {
  const github = fakeGitHub();
  const service = createService({ github, agentAssignee: 'copilot-swe-agent' });

  const out = await service.createRequest(
    { chapter: '2.3 Two Halves', change: 'Define gradient', doneWhen: 'Followable' },
    teacher
  );

  assert.equal(out.request, 42);
  const [, posted] = github.calls.find(([name]) => name === 'createRequest');
  assert.equal(posted.chapter, '2.3 Two Halves');

  const body = github.buildIssueBody({
    chapter: '2.3 Two Halves', change: 'Define gradient', doneWhen: 'Followable',
  });
  for (const heading of ['### Which chapter', '### What should change', '### How will we know']) {
    assert.ok(body.includes(heading), `missing ${heading}`);
  }
});

test('the request records who asked, and the agent assignment is best-effort', async () => {
  const github = fakeGitHub();
  github.assignAgent = async () => { throw new Error('cannot assign'); };
  const service = createService({ github, agentAssignee: 'copilot-swe-agent' });

  const out = await service.createRequest({ chapter: 'c', change: 'x' }, teacher);
  assert.ok(out.assignment.failed, 'a failed assignment must not lose the request');
  const comment = github.calls.find(([name]) => name === 'commentOnThread');
  assert.ok(comment[2].includes('Ms Lee'), 'the requester must be named in the thread');
});

test('a correction is passed through in the teacher\'s own words', async () => {
  const github = fakeGitHub();
  const service = createService({ github });

  const words = 'Put the stomata bit back, and keep it short.';
  await service.addCorrection(42, { text: words }, teacher);

  const call = github.calls.find(([name]) => name === 'commentOnThread' && name !== undefined);
  assert.equal(call[1], 7, 'the correction belongs on the draft, not the request');
  assert.ok(call[2].includes('@copilot'), 'the agent must be addressed or it will not act');
  assert.ok(call[2].includes(words), 'the wording must not be paraphrased');
});

test('publishing dispatches the commit the draft currently points at', async () => {
  const github = fakeGitHub();
  const service = createService({ github });

  await service.publish(42, {}, teacher);

  const [, dispatched] = github.calls.find(([name]) => name === 'dispatchPublish');
  assert.equal(dispatched.headSha, 'abc123');
  assert.equal(dispatched.prNumber, 7);
  assert.equal(dispatched.requestNumber, 42);
});

test('the approver is the caller, even if the body claims otherwise', async () => {
  const github = fakeGitHub();
  const service = createService({ github });

  await service.publish(42, { approvedBy: 'someone-else@hkis.edu.hk' }, teacher);

  const [, dispatched] = github.calls.find(([name]) => name === 'dispatchPublish');
  assert.equal(dispatched.approvedBy, teacher.email);
});

test('a draft that changed since the teacher looked is refused', async () => {
  const github = fakeGitHub();
  const service = createService({ github });

  await assert.rejects(
    () => service.publish(42, { headSha: 'older-sha' }, teacher),
    (err) => err instanceof ServiceError && err.status === 409
  );
});

test('nothing can be published twice, or published with no draft', async () => {
  const merged = fakeGitHub({
    draft: { number: 7, headSha: 'abc', merged: true, title: 't', url: 'u' },
  });
  await assert.rejects(
    () => createService({ github: merged }).publish(42, {}, teacher),
    (err) => err.status === 409
  );

  const none = fakeGitHub({ draft: undefined });
  await assert.rejects(
    () => createService({ github: none }).publish(42, {}, teacher),
    (err) => err.status === 409
  );
});

test('every operation refuses an anonymous caller', async () => {
  const service = createService({ github: fakeGitHub() });
  for (const call of [
    () => service.createRequest({ chapter: 'c', change: 'x' }, undefined),
    () => service.getRequest(42, undefined),
    () => service.addCorrection(42, { text: 'x' }, undefined),
    () => service.publish(42, {}, undefined),
  ]) {
    await assert.rejects(call, (err) => err.status === 401);
  }
});

test('empty or oversized fields are rejected before reaching GitHub', async () => {
  const github = fakeGitHub();
  const service = createService({ github });

  await assert.rejects(() => service.createRequest({ chapter: '  ', change: 'x' }, teacher),
    (err) => err.status === 400);
  await assert.rejects(() => service.createRequest({ chapter: 'c', change: 'y'.repeat(2001) }, teacher),
    (err) => err.status === 400);
  assert.equal(github.calls.filter(([n]) => n === 'createRequest').length, 0);
});

test('the draft summary comes from the diff-generated comment', () => {
  const summary = summariseDraft([
    { body: 'chatter' },
    { body: '<!-- draft-ready -->\n**Draft ready.**\n\nShortened two paragraphs.' },
  ]);
  assert.ok(summary.includes('Shortened two paragraphs'));
  assert.ok(!summary.includes('draft-ready'), 'the marker must not leak to the teacher');
});

test('identity comes from the Entra principal header', () => {
  const principal = Buffer.from(JSON.stringify({
    userId: 'u1',
    userDetails: 'lee@hkis.edu.hk',
    userRoles: ['Teacher'],
    claims: [
      { typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', val: 'lee@hkis.edu.hk' },
    ],
  })).toString('base64');

  const actor = identify({ 'x-ms-client-principal': principal }, {});
  assert.equal(actor.email, 'lee@hkis.edu.hk');
  assert.deepEqual(actor.roles, ['Teacher']);
});

test('a required role is enforced, and left unset allows any signed-in caller', () => {
  const actor = { id: 'x', name: 'n', email: 'e', roles: ['Teacher'] };
  assert.doesNotThrow(() => authorise(actor, {}));
  assert.doesNotThrow(() => authorise(actor, { TEACHER_ROLE: 'Teacher' }));
  assert.throws(() => authorise(actor, { TEACHER_ROLE: 'CourseEditor' }), AuthError);
  assert.throws(() => authorise(undefined, {}), AuthError);
});
