(function(){
  function el(tag, attrs, children){
    const n = document.createElement(tag);
    if(attrs){
      Object.keys(attrs).forEach(k=>{
        if(k === 'class') n.className = attrs[k];
        else if(k === 'text') n.textContent = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    (children||[]).forEach(c=> n.appendChild(c));
    return n;
  }

  async function apiGet(path, params){
    const url = new URL(SawahSports.restUrl + path, window.location.origin);
    if(params){
      Object.keys(params).forEach(k=>{
        if(params[k] !== undefined && params[k] !== null && String(params[k]).length){
          url.searchParams.set(k, params[k]);
        }
      });
    }
    const res = await fetch(url.toString(), {
      headers: { 'X-WP-Nonce': SawahSports.nonce }
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  function teamFromParticipants(participants, isHome){
    if(!Array.isArray(participants)) return null;
    const p = participants.find(x => x && x.meta && (x.meta.location === (isHome ? 'home' : 'away')));
    return p || participants[isHome ? 0 : 1] || null;
  }

  function renderLiveList(root, data, compact){
    const body = root.querySelector('.ss-body');
    body.innerHTML = '';
    const list = el('div', {class:'ss-list'});
    const fixtures = (data && data.data) ? data.data : [];
    if(!fixtures.length){
      body.appendChild(el('div',{class:'ss-error', text:'No live matches right now.'}));
      return;
    }

    fixtures.forEach(f=>{
      const participants = (f && f.participants && f.participants.data) ? f.participants.data : (f.participants || []);
      const home = teamFromParticipants(participants, true);
      const away = teamFromParticipants(participants, false);

      const homeName = home ? (home.name || 'Home') : 'Home';
      const awayName = away ? (away.name || 'Away') : 'Away';
      const homeLogo = home && (home.image_path || home.logo_path) ? (home.image_path || home.logo_path) : '';
      const awayLogo = away && (away.image_path || away.logo_path) ? (away.image_path || away.logo_path) : '';

      const scores = f && f.scores ? f.scores : null;
      let scoreTxt = '—';
      if(scores && Array.isArray(scores)){
        // Try to pick "CURRENT" style score; fall back to last.
        const current = scores.find(s => (s.description || '').toLowerCase().includes('current')) || scores[scores.length-1];
        if(current && typeof current.score === 'object'){
          const h = current.score.home ?? current.score.home_score ?? '';
          const a = current.score.away ?? current.score.away_score ?? '';
          if(String(h).length || String(a).length) scoreTxt = h + ' - ' + a;
        }
      } else if(f && (f.result_info || f.name)){
        // Not a true score, but better than blank.
      }

      const minute = f && (f.time && f.time.minute !== undefined) ? (String(f.time.minute) + "'") : (f && f.starting_at ? '' : '');

      const row = el('div',{class:'ss-row'});
      row.appendChild(el('div',{class:'ss-team'},[
        el('div',{class:'ss-crest'},[ homeLogo ? el('img',{src:homeLogo, alt:homeName}) : el('div') ]),
        el('div',{class:'ss-name', text: homeName})
      ]));

      row.appendChild(el('div',{class:'ss-mid'},[
        el('div',{class:'ss-score', text: scoreTxt}),
        el('div',{class:'ss-meta', text: minute || ''})
      ]));

      row.appendChild(el('div',{class:'ss-team right'},[
        el('div',{class:'ss-name', text: awayName}),
        el('div',{class:'ss-crest'},[ awayLogo ? el('img',{src:awayLogo, alt:awayName}) : el('div') ])
      ]));

      list.appendChild(row);
    });

    body.appendChild(list);
  }

  function renderStandings(root, data){
    const body = root.querySelector('.ss-body');
    body.innerHTML = '';
    const rows = (data && data.data) ? data.data : [];

    if(!rows.length){
      body.appendChild(el('div',{class:'ss-error', text:'No standings data.'}));
      return;
    }

    const table = el('table', {class:'ss-standings-table'});
    const thead = el('thead', null, [el('tr', null, [
      el('th',{text:'#'}), el('th',{text:'Team'}), el('th',{text:'P'}), el('th',{text:'W'}), el('th',{text:'D'}), el('th',{text:'L'}), el('th',{text:'GD'}), el('th',{text:'Pts'})
    ])]);
    table.appendChild(thead);

    const tbody = el('tbody');
    rows.forEach(r=>{
      const team = r.participant || r.team || (r.participant && r.participant.data) || null;
      const name = team ? (team.name || '') : '';
      const pos = r.position ?? '';
      const played = r.played ?? r.matches_played ?? '';
      const win = r.won ?? r.wins ?? '';
      const draw = r.draw ?? r.draws ?? '';
      const loss = r.lost ?? r.losses ?? '';
      const gd = r.goal_difference ?? r.goals_diff ?? '';
      const pts = r.points ?? '';
      tbody.appendChild(el('tr', null, [
        el('td',{text:String(pos)}),
        el('td',{text:name}),
        el('td',{text:String(played)}),
        el('td',{text:String(win)}),
        el('td',{text:String(draw)}),
        el('td',{text:String(loss)}),
        el('td',{text:String(gd)}),
        el('td',{text:String(pts)})
      ]));
    });
    table.appendChild(tbody);
    body.appendChild(table);
  }

  function renderFixtures(root, data){
    const body = root.querySelector('.ss-body');
    body.innerHTML = '';
    const fixtures = (data && data.data) ? data.data : [];
    if(!fixtures.length){
      body.appendChild(el('div',{class:'ss-error', text:'No fixtures found.'}));
      return;
    }
    const list = el('div',{class:'ss-list'});
    fixtures.forEach(f=>{
      const participants = (f && f.participants && f.participants.data) ? f.participants.data : (f.participants || []);
      const home = teamFromParticipants(participants, true);
      const away = teamFromParticipants(participants, false);
      const homeName = home ? (home.name || 'Home') : 'Home';
      const awayName = away ? (away.name || 'Away') : 'Away';
      const homeLogo = home && (home.image_path || home.logo_path) ? (home.image_path || home.logo_path) : '';
      const awayLogo = away && (away.image_path || away.logo_path) ? (away.image_path || away.logo_path) : '';

      const when = (f && f.starting_at) ? String(f.starting_at).replace('T',' ').replace('Z','') : '';
      const status = (f && f.state) ? String(f.state) : (f && f.status) ? String(f.status) : '';

      const row = el('div',{class:'ss-row'});
      row.appendChild(el('div',{class:'ss-team'},[
        el('div',{class:'ss-crest'},[ homeLogo ? el('img',{src:homeLogo, alt:homeName}) : el('div') ]),
        el('div',{class:'ss-name', text: homeName})
      ]));

      row.appendChild(el('div',{class:'ss-mid'},[
        el('div',{class:'ss-score', text: status ? status.toUpperCase() : '—'}),
        el('div',{class:'ss-meta', text: when})
      ]));

      row.appendChild(el('div',{class:'ss-team right'},[
        el('div',{class:'ss-name', text: awayName}),
        el('div',{class:'ss-crest'},[ awayLogo ? el('img',{src:awayLogo, alt:awayName}) : el('div') ])
      ]));

      list.appendChild(row);
    });
    body.appendChild(list);
  }

  async function loadLive(root){
    const league = root.getAttribute('data-league') || '';
    const refresh = parseInt(root.getAttribute('data-refresh') || '20', 10);
    const compact = root.getAttribute('data-compact') === '1';

    try{
      const data = await apiGet('/livescores', { league_id: league });
      renderLiveList(root, data, compact);
    }catch(e){
      const body = root.querySelector('.ss-body');
      if(body) body.innerHTML = '<div class="ss-error">Unable to load live matches.</div>';
    }

    if(refresh && refresh >= 5){
      window.setTimeout(()=>loadLive(root), refresh * 1000);
    }
  }

  async function loadStandings(root){
    const season = root.getAttribute('data-season') || '';
    if(!season || season === '0'){
      const body = root.querySelector('.ss-body');
      if(body) body.innerHTML = '<div class="ss-error">Set a Season ID in the widget settings.</div>';
      return;
    }
    try{
      const data = await apiGet('/standings', { season_id: season });
      renderStandings(root, data);
    }catch(e){
      const body = root.querySelector('.ss-body');
      if(body) body.innerHTML = '<div class="ss-error">Unable to load standings.</div>';
    }
  }

  async function loadFixtures(root){
    const league = root.getAttribute('data-league') || '';
    const date = root.getAttribute('data-date') || '';
    const params = {};
    if(league) params.league_id = league;
    params.date = date || new Date().toISOString().slice(0,10);

    try{
      const data = await apiGet('/fixtures', params);
      renderFixtures(root, data);
    }catch(e){
      const body = root.querySelector('.ss-body');
      if(body) body.innerHTML = '<div class="ss-error">Unable to load fixtures.</div>';
    }
  }

  function boot(){
    document.querySelectorAll('.ss-widget.ss-live').forEach(loadLive);
    document.querySelectorAll('.ss-widget.ss-standings').forEach(loadStandings);
    document.querySelectorAll('.ss-widget.ss-fixtures').forEach(loadFixtures);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(); 
