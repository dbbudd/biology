/* =============================================================
   CHANGE LOG — where the change history comes from
   -------------------------------------------------------------
   There is no backend and no build step, so this reads the public
   GitHub API directly from the browser. That is only acceptable
   because the repository is public and the data is already public.

   Two things to keep in mind if this ever misbehaves:

   1. Unauthenticated GitHub allows 60 requests per hour per IP.
      This page makes two. Behind a school's shared egress IP that
      is still worth caching, so results live in localStorage for
      ten minutes.
   2. It shows what the changes SAID, in the words the change was
      described in — not a re-summary. The description is written
      for a teacher, so it reads correctly here.

   Make the repository private and this page stops working: the
   API will answer 404 without a token.
   ============================================================= */

(function () {
    'use strict';

    var REPO    = 'dbbudd/biology';
    var API     = 'https://api.github.com/repos/' + REPO;
    var CACHE   = 'bio_changelog_v1';
    var TTL_MS  = 10 * 60 * 1000;

    var progressEl  = document.getElementById('cl-progress');
    var publishedEl = document.getElementById('cl-published');
    if (!progressEl || !publishedEl) return;

    /* ---------- helpers ---------- */

    function iso(ts) { return ts ? new Date(ts) : null; }

    function formatWhen(ts) {
        var d = iso(ts);
        if (!d || isNaN(d)) return '';
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // The change bodies are written against a template with HTML comments
    // for guidance. Those are for the author, not the reader.
    function stripComments(text) {
        return String(text || '').replace(/<!--[\s\S]*?-->/g, '');
    }

    /* Pull the text under a `### Heading` from a change body.
       Line-based rather than one regex: a lookahead ending in `$` matches at
       every line end once the `m` flag is set, so a regex version quietly
       returns the heading and nothing else. */
    function section(body, heading) {
        var lines = stripComments(body).split('\n');
        var re = new RegExp('^#{1,6}\\s*' + heading, 'i');
        var out = [];
        var collecting = false;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!collecting) {
                if (re.test(line)) collecting = true;
                continue;
            }
            if (/^#{1,6}\s/.test(line)) break;          // next section
            var t = line
                .replace(/^\s*[-*]\s*\[[ x]\]\s*/i, '')  // checklist boxes
                .replace(/\*/g, '')            // **bold** and *italic* both
                .replace(/`/g, '')
                .trim();
            if (t && t !== '…') out.push(t);
            if (out.length >= 3) break;
        }
        return out.join(' ').trim();
    }

    /* Who is allowed to appear in a teacher-facing log.
       The repository is public, so anyone with a GitHub account can open an
       issue, and a stranger copying the form's headings would otherwise show
       up here as if a teacher had asked for something. */
    var TRUSTED_ASSOCIATIONS = ['OWNER', 'MEMBER', 'COLLABORATOR'];

    function isTrusted(issue) {
        var association = String(issue.author_association || '').toUpperCase();
        return TRUSTED_ASSOCIATIONS.indexOf(association) !== -1;
    }

    /* A change request is:
         - labelled `change-request`, which only someone with write access can
           apply, so the label is itself the trust signal; or
         - shaped like the form AND written by a trusted author.
       Fallback two exists because GitHub drops a label from an issue form when
       that label does not exist yet. */
    function isRequest(issue) {
        if (!issue || issue.pull_request) return false;

        var labels = (issue.labels || []).map(function (l) {
            return (typeof l === 'string' ? l : l.name) || '';
        });
        if (labels.indexOf('change-request') !== -1) return true;

        return isTrusted(issue) && /###\s*Which chapter or section\?/i.test(issue.body || '');
    }

    function titleOf(item) {
        return (item.title || 'Untitled change').replace(/^\[change\]\s*/i, '');
    }

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    function item(o) {
        var li = el('li', 'cl-item');

        var head = el('div', 'cl-head');
        head.appendChild(el('p', 'cl-title', o.title));
        if (o.chip) head.appendChild(el('span', 'cl-chip' + (o.chipClass ? ' ' + o.chipClass : ''), o.chip));
        if (o.when) head.appendChild(el('span', 'cl-when', o.when));
        li.appendChild(head);

        if (o.where) li.appendChild(el('p', 'cl-where', o.where));
        if (o.summary) li.appendChild(el('p', 'cl-summary', o.summary));
        return li;
    }

    function showList(listEl, items, emptyText) {
        listEl.textContent = '';
        if (!items.length) {
            listEl.appendChild(el('li', 'cl-empty', emptyText));
            return;
        }
        items.forEach(function (n) { listEl.appendChild(n); });
    }

    function showError(message) {
        [progressEl, publishedEl].forEach(function (list) {
            list.textContent = '';
            var li = el('li', 'cl-error');
            li.appendChild(document.createTextNode(message + ' '));
            var btn = el('button', 'cl-retry', 'Try again');
            btn.addEventListener('click', function () {
                try { localStorage.removeItem(CACHE); } catch (e) { /* ignore */ }
                load();
            });
            li.appendChild(btn);
            list.appendChild(li);
        });
    }

    /* ---------- cache ---------- */

    function readCache() {
        try {
            var raw = localStorage.getItem(CACHE);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || (Date.now() - parsed.at) > TTL_MS) return null;
            return parsed.data;
        } catch (e) { return null; }
    }

    function writeCache(data) {
        try {
            localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), data: data }));
        } catch (e) { /* private mode, or storage partitioned — fine */ }
    }

    /* ---------- fetch ---------- */

    function getJSON(url) {
        return fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
            .then(function (r) {
                if (r.status === 403 || r.status === 429) {
                    throw new Error('rate');
                }
                if (!r.ok) throw new Error('http ' + r.status);
                return r.json();
            });
    }

    function load() {
        var cached = readCache();
        if (cached) { render(cached); return; }

        Promise.all([
            // Not filtered by label: GitHub silently drops a label from an issue
            // form when that label does not exist yet, which would hide every
            // request. Filter in code instead — see isRequest().
            getJSON(API + '/issues?state=all&per_page=30&sort=updated'),
            getJSON(API + '/pulls?state=all&per_page=30&sort=updated')
        ]).then(function (res) {
            render({ issues: res[0], pulls: res[1] });
            writeCache({ issues: res[0], pulls: res[1] });
        }).catch(function (err) {
            if (!navigator.onLine) {
                showError('This list needs a connection. Reconnect and try again.');
                return;
            }
            if (err && err.message === 'rate') {
                showError('Too many people have loaded this page in the last hour. Try again shortly.');
                return;
            }
            showError('The change log could not be loaded just now.');
        });
    }

    /* ---------- render ---------- */

    function render(data) {
        var pulls  = (data.pulls  || []).filter(function (p) { return !p.draft || p.merged_at; });
        var issues = (data.issues || []).filter(isRequest);

        var merged  = pulls.filter(function (p) { return p.merged_at; });
        var drafting = pulls.filter(function (p) { return !p.merged_at; });

        var progress = [];

        // An open request that has no draft yet.
        issues
            .filter(function (i) { return i.state === 'open'; })
            .sort(function (a, b) { return new Date(b.updated_at) - new Date(a.updated_at); })
            .forEach(function (i) {
                progress.push(item({
                    title: titleOf(i),
                    chip: 'Requested',
                    when: formatWhen(i.created_at),
                    where: section(i.body, 'Which chapter or section\\??'),
                    summary: section(i.body, 'What should change\\?')
                }));
            });

        // Drafts that exist but are not published.
        drafting
            .sort(function (a, b) { return new Date(b.updated_at) - new Date(a.updated_at); })
            .forEach(function (p) {
                progress.push(item({
                    title: titleOf(p),
                    chip: 'Drafting',
                    when: formatWhen(p.created_at),
                    where: section(p.body, 'Where'),
                    summary: section(p.body, 'What changed')
                }));
            });

        var archive = merged
            .sort(function (a, b) { return new Date(b.merged_at) - new Date(a.merged_at); })
            .map(function (p) {
                return item({
                    title: titleOf(p),
                    chip: 'Published',
                    chipClass: 'cl-chip--published',
                    when: formatWhen(p.merged_at),
                    where: section(p.body, 'Where'),
                    summary: section(p.body, 'What changed')
                });
            });

        showList(progressEl, progress, 'Nothing is in progress right now.');
        showList(publishedEl, archive, 'Nothing has been published yet.');
    }

    load();
})();
