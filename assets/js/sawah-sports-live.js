(function(){
  "use strict";

  function el(tag, attrs, children){
    const n = document.createElement(tag);
    if(attrs){
      Object.keys(attrs).forEach(k=>{
        if(k === 'class') n.className = attrs[k];
        else if(k === 'text') n.textContent = attrs[k];
        else if(k === 'html') n.innerHTML = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    (children||[]).forEach(c=> n.appendChild(c));
    return n;
  }

  function unwrapData(x){
    if(!x) return x;
    if(Array.isArray(x)) return x;
    if(typeof x === 'object' && x.data !== undefined) return x.data;
    return x;
  }

  async function apiGet(path, params){
    const url = new URL(SawahSports.restUrl + path, window.location.origin);
    if(params){
      Object.keys(params).forEach(k=>{
        const v = params[k];
        if(v === undefined || v === null || v === '') return;
        url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString(), {
      headers: { 'X-WP-Nonce': SawahSports.nonce }
    });

    // try to read json either way (WP REST returns {code,message,...})
    let data = null;
    try { data = await res.json(); } catch(e) {}

    if(!res.ok){
      const msg = (data && (data.message || (data.data && data.data.message))) ? (data.message || data.data.message) : ('HTTP ' + res.status);
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }

    return data;
  }

  function teamFromParticipants(participants, location){
    const list = unwrapData(participants);
    if(!Array.isArray(list)) return null;

    // Try meta.location first.
    const byMeta = list.find(x => x && x.meta && String(x.meta.location).toLowerCase() === location);
    if(byMeta) return byMeta;

    // Fallback: sometimes it's "home" / "away" in a nested participant meta.
    const byMeta2 = list.find(x => x && x.meta && String(x.meta.location).toLowerCase().includes(location));
    if(byMeta2) return byMeta2;

    // Fallback: first/second
    return list[location === 'home' ? 0 : 1] || null;
  }

  function logoUrl(team){
    if(!team) return '';
    return team.image_path || team.logo_path || team.image || '';
  }

  function initials(name){
    const p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if(!p.length) return '—';
    const a = p[0][0] || '';
    const b = (p.length > 1 ? p[p.length-1][0] : '') || '';
    return (a + b).toUpperCase();
  }

  function teamNode(team, align){
    const name = team ? (team.name || team.short_code || '—') : '—';
    const logo = logoUrl(team);
    const wrap = el('div', {class:'ss-team ' + (align === 'right' ? 'is-right' : 'is-left')});
    const badge = logo
      ? el('img', {class:'ss-team-logo', src:logo, alt:name, loading:'lazy'})
      : el('span', {class:'ss-team-logo ss-team-fallback', text: initials(name)});
    wrap.appendChild(badge);
    wrap.appendChild(el('span', {class:'ss-team-name', text:name}));
    return wrap;
  }

  function scoreText(fx){
    const scores = unwrapData(fx && fx.scores);
    if(Array.isArray(scores) && scores.length){
      const cur = scores.find(s => String(s.description || '').toLowerCase().includes('current')) || scores[scores.length-1];
      if(cur && typeof cur.score === 'object' && cur.score){
        const h = cur.score.home ?? cur.score.home_score ?? cur.score.localteam_score ?? cur.score.homeTeam ?? '';
        const a = cur.score.away ?? cur.score.away_score ?? cur.score.visitorteam_score ?? cur.score.awayTeam ?? '';
        if(String(h).length || String(a).length) return `${h} - ${a}`;
      }
      // sometimes scores are split per participant; fallback to any numeric "score" field
      if(cur && cur.score !== undefined && typeof cur.score !== 'object') return String(cur.score);
    }
    return '—';
  }

  function stateLabel(fx){
    const st = unwrapData(fx && fx.state);
    if(st && typeof st === 'object'){
      return st.name || st.state || '';
    }
    // fallback to result_info or state_id
    return fx.result_info || (fx.state_id ? ('State ' + fx.state_id) : '');
  }

  function fmtKickoff(fx){
    // Use starting_at if present (YYYY-MM-DD HH:mm:ss)
    const s = fx && fx.starting_at;
    if(!s) return '';
    // show HH:mm
    const m = String(s).match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : String(s);
  }

  function renderError(body, msg){
    body.innerHTML = '';
    body.appendChild(el('div',{class:'ss-error', text: msg}));
  }

  function renderLiveList(root, data){
    const body = root.querySelector('.ss-body');
    body.innerHTML = '';
    const fixtures = (data && data.data) ? data.data : [];

    if(!fixtures.length){
      body.appendChild(el('div',{class:'ss-empty', text: SawahSports.i18n.noLive || 'No live matches right now.'}));
      return;
    }

    const list = el('div', {class:'ss-match-list'});
    fixtures.forEach(fx=>{
      const participants = fx && fx.participants ? fx.participants : [];
      const home = teamFromParticipants(participants, 'home');
      const away = teamFromParticipants(participants, 'away');

      const head = el('div', {class:'ss-match-head'}, [
        el('div', {class:'ss-league', text: (unwrapData(fx.league) && unwrapData(fx.league).name) ? unwrapData(fx.league).name : (fx.league_id ? ('League ' + fx.league_id) : '')}),
        el('div', {class:'ss-badges'}, [
          el('span', {class:'ss-pill ss-pill-live', text: SawahSports.i18n.live || 'LIVE'}),
          el('span', {class:'ss-pill ss-pill-state', text: stateLabel(fx) || ''}),
        ])
      ]);

      const mid = el('div', {class:'ss-match-mid'}, [
        teamNode(home,'left'),
        el('div', {class:'ss-scorebox'}, [
          el('div', {class:'ss-score', text: scoreText(fx)}),
          el('div', {class:'ss-kickoff', text: fmtKickoff(fx)}),
        ]),
        teamNode(away,'right'),
      ]);

      const row = el('div', {class:'ss-match-row'}, [head, mid]);
      list.appendChild(row);
    });

    body.appendChild(list);
  }

  function renderFixtures(root, data){
    const body = root.querySelector('.ss-body');
    body.innerHTML = '';
    const fixtures = (data && data.data) ? data.data : [];

    if(!fixtures.length){
      body.appendChild(el('div',{class:'ss-empty', text: SawahSports.i18n.noFixtures || 'No fixtures found.'}));
      return;
    }

    const list = el('div', {class:'ss-match-list'});
    fixtures.forEach(fx=>{
      const participants = fx && fx.participants ? fx.participants : [];
      const home = teamFromParticipants(participants, 'home');
      const away = teamFromParticipants(participants, 'away');

      const head = el('div', {class:'ss-match-head'}, [
        el('div', {class:'ss-league', text: (unwrapData(fx.league) && unwrapData(fx.league).name) ? unwrapData(fx.league).name : (fx.league_id ? ('League ' + fx.league_id) : '')}),
        el('div', {class:'ss-badges'}, [
          el('span', {class:'ss-pill ss-pill-state', text: stateLabel(fx) || ''}),
        ])
      ]);

      const mid = el('div', {class:'ss-match-mid'}, [
        teamNode(home,'left'),
        el('div', {class:'ss-scorebox'}, [
          el('div', {class:'ss-score', text: scoreText(fx)}),
          el('div', {class:'ss-kickoff', text: fmtKickoff(fx)}),
        ]),
        teamNode(away,'right'),
      ]);

      list.appendChild(el('div', {class:'ss-match-row'}, [head, mid]));
    });

    body.appendChild(list);
  }

  function normalizeKey(s){
    return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }

  function pickDetail(details, regex){
    const arr = unwrapData(details);
    if(!Array.isArray(arr)) return null;
    for(const d of arr){
      const t = unwrapData(d.type);
      const name = normalizeKey((t && (t.name || t.developer_name || t.code)) || d.name || d.developer_name || '');
      if(!name) continue;
      if(regex.test(name)) return d;
    }
    return null;
  }

  function detailValue(d){
    if(!d) return '';
    const v = d.value ?? d.total ?? d.points ?? d.count ?? '';
    return v === null || v === undefined ? '' : String(v);
  }

  function renderFormDots(form){
    if(!form) return null;
    let str = '';
    if(typeof form === 'string') str = form;
    else {
      const u = unwrapData(form);
      if(typeof u === 'string') str = u;
      else if(u && typeof u === 'object' && typeof u.form === 'string') str = u.form;
    }
    str = String(str || '').trim();
    if(!str) return null;

    const wrap = el('div', {class:'ss-form'});
    // last 5
    const last = str.slice(-5).split('');
    last.forEach(ch=>{
      const c = String(ch).toUpperCase();
      const cls = c === 'W' ? 'is-w' : (c === 'D' ? 'is-d' : (c === 'L' ? 'is-l' : 'is-n'));
      wrap.appendChild(el('span',{class:'ss-form-dot ' + cls, text:c}));
    });
    return wrap;
  }

  function renderStandings(root, data){
    const body = root.querySelector('.ss-body');
    body.innerHTML = '';
    const rows = (data && data.data) ? data.data : [];

    if(!rows.length){
      body.appendChild(el('div',{class:'ss-empty', text: SawahSports.i18n.noStandings || 'No standings data.'}));
      return;
    }

    const showForm = root.getAttribute('data-show-form') === '1';

    const table = el('table', {class:'ss-standings-table'});
    const thead = el('thead', null, [el('tr', null, [
      el('th',{text:'#'}),
      el('th',{text: SawahSports.i18n.team || 'Team'}),
      el('th',{text:'P'}),
      el('th',{text:'W'}),
      el('th',{text:'D'}),
      el('th',{text:'L'}),
      el('th',{text:'GF'}),
      el('th',{text:'GA'}),
      el('th',{text:'GD'}),
      el('th',{text:'Pts'}),
      showForm ? el('th',{text: SawahSports.i18n.form || 'Form'}) : null
    ].filter(Boolean))]);
    table.appendChild(thead);

    const tbody = el('tbody');
    rows.forEach(r=>{
      const team = unwrapData(r.participant) || unwrapData(r.team) || null;
      const name = team ? (team.name || '') : ('#' + (r.participant_id || ''));
      const logo = team ? logoUrl(team) : '';

      const details = r.details;
      const played = detailValue(pickDetail(details, /(games|matches)\s+played|played/));
      const won = detailValue(pickDetail(details, /\bwon\b|\bwins?\b/));
      const draw = detailValue(pickDetail(details, /\bdraw/));
      const lost = detailValue(pickDetail(details, /\blost\b|\bloss/));
      const gf = detailValue(pickDetail(details, /goals?\s+for|\bfor\b/));
      const ga = detailValue(pickDetail(details, /goals?\s+against|against/));
      const gd = detailValue(pickDetail(details, /goal\s+difference|difference|gd\b/));

      const pts = (r.points !== undefined && r.points !== null) ? String(r.points) : '';
      const pos = (r.position !== undefined && r.position !== null) ? String(r.position) : '';

      const teamCell = el('div', {class:'ss-td-team'});
      if(logo){
        teamCell.appendChild(el('img',{class:'ss-team-logo', src:logo, alt:name, loading:'lazy'}));
      } else {
        teamCell.appendChild(el('span',{class:'ss-team-logo ss-team-fallback', text:initials(name)}));
      }
      teamCell.appendChild(el('span',{class:'ss-team-name', text:name}));

      const formNode = showForm ? (renderFormDots(r.form) || el('span',{class:'ss-muted', text:'—'})) : null;

      const tr = el('tr', null, [
        el('td',{class:'ss-td-pos', text: pos || '—'}),
        el('td', null, [teamCell]),
        el('td',{text: played || '—'}),
        el('td',{text: won || '—'}),
        el('td',{text: draw || '—'}),
        el('td',{text: lost || '—'}),
        el('td',{text: gf || '—'}),
        el('td',{text: ga || '—'}),
        el('td',{text: gd || '—'}),
        el('td',{class:'ss-td-pts', text: pts || '—'}),
        showForm ? el('td', null, [formNode]) : null
      ].filter(Boolean));

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const wrap = el('div',{class:'ss-table-wrap'},[table]);
    body.appendChild(wrap);
  }

  async function loadLive(root){
    const league = root.getAttribute('data-league-id') || '';
    try{
      const data = await apiGet('/livescores', { league_id: league });
      renderLiveList(root, data);
    }catch(e){
      renderError(root.querySelector('.ss-body'), (SawahSports.i18n.liveErr || 'Unable to load live matches.') + (e && e.message ? (' ' + e.message) : ''));
    }
  }

  async function loadStandings(root){
    const season = root.getAttribute('data-season-id') || '';
    try{
      const data = await apiGet('/standings', { season_id: season });
      renderStandings(root, data);
    }catch(e){
      renderError(root.querySelector('.ss-body'), (SawahSports.i18n.standingsErr || 'Unable to load standings.') + (e && e.message ? (' ' + e.message) : ''));
    }
  }

  async function loadFixtures(root){
    const league = root.getAttribute('data-league-id') || '';
    const date = root.getAttribute('data-date') || '';
    try{
      const data = await apiGet('/fixtures', { league_id: league, date: date });
      renderFixtures(root, data);
    }catch(e){
      renderError(root.querySelector('.ss-body'), (SawahSports.i18n.fixturesErr || 'Unable to load fixtures.') + (e && e.message ? (' ' + e.message) : ''));
    }
  }

  function boot(){
    document.querySelectorAll('.ss-live-matches').forEach(root=>{
      loadLive(root);
      const refresh = parseInt(root.getAttribute('data-refresh') || '0', 10);
      if(refresh > 0){
        setInterval(()=> loadLive(root), refresh * 1000);
      }
    });

    document.querySelectorAll('.ss-standings').forEach(root=>{
      loadStandings(root);
    });

    document.querySelectorAll('.ss-fixtures').forEach(root=>{
      loadFixtures(root);
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();