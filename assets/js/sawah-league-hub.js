(function($){
  'use strict';

  const I18N = (window.SawahSports && window.SawahSports.i18n) ? window.SawahSports.i18n : {};
  const REST = (window.SawahSports && window.SawahSports.restUrl) ? window.SawahSports.restUrl : '';

  const PRIORITIES = ['CURRENT','FT_SCORE','FULLTIME','FINAL','AET','PENALTIES','HT_SCORE','HALFTIME','1ST_HALF','2ND_HALF'];

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function getTeam(fx, loc){
    const parts = fx && fx.participants ? fx.participants : [];
    return parts.find(p => p && p.meta && p.meta.location === loc) || null;
  }

  function isLiveState(short){
    return ['LIVE','HT','ET','PEN_LIVE','1ST_HALF','2ND_HALF'].includes(String(short||'').toUpperCase());
  }

  function getMinuteLabel(fx){
    const short = String(fx?.state?.short_name || '').toUpperCase();
    if (short === 'FT' || short === 'AET' || short === 'FT_PEN') return 'FT';
    if (short === 'HT') return 'HT';
    const minute =
      fx?.time?.minute ??
      fx?.time?.minutes ??
      fx?.state?.minute ??
      fx?.state?.minutes ??
      fx?.inplay?.minute ??
      null;
    if (minute != null && minute !== '') return `${minute}'`;
    // fallback: kickoff time
    const t = fx?.starting_at?.time || fx?.starting_at?.time_short || fx?.starting_at?.time_simple;
    return t ? String(t) : '-';
  }

  function scoreFromItem(item){
    const sc = item && item.score ? item.score : null;
    if (!sc) return null;
    // combined formats
    if (sc.home != null && sc.away != null) return {home: Number(sc.home)||0, away:Number(sc.away)||0};
    if (sc.goals && (sc.goals.home != null || sc.goals.away != null)) {
      return {home:Number(sc.goals.home)||0, away:Number(sc.goals.away)||0};
    }
    return null;
  }

  function getScoreRobust(fx){
    const short = String(fx?.state?.short_name || '').toUpperCase();

    // Not started
    if (['NS','TBA','INT','POST','CANCL','POSTP','DELAYED'].includes(short)) return {home:'-', away:'-'};

    const scores = Array.isArray(fx?.scores) ? fx.scores : [];
    if (!scores.length) return {home:'-', away:'-'};

    const homeId = getTeam(fx,'home')?.id;
    const awayId = getTeam(fx,'away')?.id;

    // Try priorities
    for (const p of PRIORITIES){
      const subset = scores.filter(s=>{
        const d = String(s?.description||'').toUpperCase();
        return d===p || d.includes(p);
      });

      if (!subset.length) continue;

      // If per-participant rows exist
      const byParticipant = subset.some(s => s?.participant_id != null);
      if (byParticipant && homeId && awayId){
        const h = subset.find(s => Number(s.participant_id) === Number(homeId));
        const a = subset.find(s => Number(s.participant_id) === Number(awayId));
        const hg = h?.score?.goals ?? h?.score?.goal ?? h?.score?.value ?? h?.score?.total ?? null;
        const ag = a?.score?.goals ?? a?.score?.goal ?? a?.score?.value ?? a?.score?.total ?? null;
        if (hg != null || ag != null){
          return {home: Number(hg)||0, away: Number(ag)||0};
        }
      }

      // Combined score object
      for (const it of subset){
        const comb = scoreFromItem(it);
        if (comb) return comb;
      }
    }

    // Fallback: last available score, try participant aggregation
    if (homeId && awayId){
      const last = scores.slice().reverse();
      const findLast = (pid)=> last.find(s => Number(s?.participant_id) === Number(pid) && s?.score);
      const h = findLast(homeId);
      const a = findLast(awayId);
      const hg = h?.score?.goals ?? null;
      const ag = a?.score?.goals ?? null;
      if (hg!=null || ag!=null) return {home:Number(hg)||0, away:Number(ag)||0};
    }

    // last combined
    for (const it of scores.slice().reverse()){
      const comb = scoreFromItem(it);
      if (comb) return comb;
    }

    return {home:'-', away:'-'};
  }

  function fmtTeam(team){
    if (!team) return {name:'—', logo:''};
    return {
      name: team.name || team.short_code || '—',
      logo: team.image_path || team.logo_path || ''
    };
  }

  function pickFeatured(fixtures){
    if (!fixtures.length) return null;
    const live = fixtures.find(f => isLiveState(f?.state?.short_name));
    if (live) return live;
    const upcoming = fixtures.find(f => String(f?.state?.short_name||'').toUpperCase()==='NS');
    if (upcoming) return upcoming;
    return fixtures[0];
  }

  function renderFeatured($root, fx){
    const $box = $root.find('.ss-lh-featured-body');
    if (!fx){
      $box.html(`<div class="ss-muted">${esc(I18N.noFixtures || 'No fixtures found.')}</div>`);
      return;
    }
    const home = fmtTeam(getTeam(fx,'home'));
    const away = fmtTeam(getTeam(fx,'away'));
    const score = getScoreRobust(fx);
    const short = String(fx?.state?.short_name||'').toUpperCase();
    const live = isLiveState(short);
    const status = live ? getMinuteLabel(fx) : (short==='FT' ? 'FT' : (fx?.starting_at?.time || getMinuteLabel(fx)));

    $box.html(`
      <div class="ss-lh-featured-row">
        <div class="ss-lh-team">
          ${home.logo ? `<img src="${esc(home.logo)}" alt="">` : ``}
          <div class="ss-lh-team-name">${esc(home.name)}</div>
        </div>
        <div class="ss-lh-score">
          <div class="ss-lh-score-box">${esc(score.home)} : ${esc(score.away)}</div>
          <div class="ss-lh-status ${live?'live':'ft'}">${esc(status)}</div>
        </div>
        <div class="ss-lh-team" style="justify-content:flex-end">
          <div class="ss-lh-team-name" style="text-align:right">${esc(away.name)}</div>
          ${away.logo ? `<img src="${esc(away.logo)}" alt="">` : ``}
        </div>
      </div>
    `);
  }

  function renderMatches($root, fixtures, filter, q){
    const $list = $root.find('.ss-lh-matches-list');
    const query = (q||'').trim().toLowerCase();

    let filtered = fixtures.slice();
    if (filter === 'live') filtered = filtered.filter(f => isLiveState(f?.state?.short_name));
    if (query){
      filtered = filtered.filter(f => {
        const h = (getTeam(f,'home')?.name||'').toLowerCase();
        const a = (getTeam(f,'away')?.name||'').toLowerCase();
        return h.includes(query) || a.includes(query);
      });
    }

    const liveCount = fixtures.filter(f => isLiveState(f?.state?.short_name)).length;
    $root.find('.ss-lh-live-count').text(`(${liveCount})`);

    if (!filtered.length){
      $list.html(`<div class="ss-muted">${esc(I18N.noFixtures || 'No fixtures found.')}</div>`);
      return;
    }

    const html = filtered.map(fx=>{
      const home = fmtTeam(getTeam(fx,'home'));
      const away = fmtTeam(getTeam(fx,'away'));
      const score = getScoreRobust(fx);
      const short = String(fx?.state?.short_name||'').toUpperCase();
      const timeLabel = isLiveState(short) ? getMinuteLabel(fx) : (fx?.starting_at?.time || '-');

      // Watch button: only if tvstations exist (same approach as todays matches)
      const hasTV = Array.isArray(fx.tvstations) && fx.tvstations.length > 0;
      const watchBtn = hasTV ? `<button class="ss-watch-live-btn" type="button"><i class="eicon-play"></i> ${esc(I18N.watch || 'Watch')}</button>` : '';

      return `
        <div class="ss-lh-match">
          <div class="ss-lh-time">${esc(timeLabel)}</div>
          <div class="ss-lh-mid">
            <div class="ss-lh-team">
              ${home.logo ? `<img src="${esc(home.logo)}" alt="">` : ``}
              <span class="ss-lh-team-name">${esc(home.name)}</span>
            </div>
            <div class="ss-lh-score-box">${esc(score.home)} : ${esc(score.away)}</div>
            <div class="ss-lh-team" style="justify-content:flex-end">
              <span class="ss-lh-team-name" style="text-align:right">${esc(away.name)}</span>
              ${away.logo ? `<img src="${esc(away.logo)}" alt="">` : ``}
            </div>
          </div>
          <div class="ss-lh-watch">${watchBtn}</div>
        </div>
      `;
    }).join('');

    $list.html(html);
  }

  function renderStandings($root, rows, scope){
    const $box = $root.find('.ss-lh-standings-body');
    if (!rows.length){
      $box.html(`<div class="ss-muted">${esc(I18N.noStandings || 'No standings data.')}</div>`);
      return;
    }

    function pickStat(r, key){
      // scope: all | home | away
      if (scope !== 'all'){
        const s = r[scope];
        if (s && typeof s === 'object'){
          // common keys
          if (key === 'played') return s.played ?? s.games_played ?? s.matches_played ?? null;
          if (key === 'won') return s.won ?? null;
          if (key === 'draw') return s.draw ?? s.drawn ?? null;
          if (key === 'lost') return s.lost ?? null;
          if (key === 'gf') return s.goals_for ?? s.goals_scored ?? s.for ?? null;
          if (key === 'ga') return s.goals_against ?? s.goals_conceded ?? s.against ?? null;
        }
      }
      // all scope fallback
      if (key === 'played') return r.played ?? r.games_played ?? r.matches_played ?? r.games ?? null;
      if (key === 'won') return r.won ?? null;
      if (key === 'draw') return r.draw ?? r.drawn ?? null;
      if (key === 'lost') return r.lost ?? null;
      if (key === 'gf') return r.goals_for ?? r.goals_scored ?? r.goals?.for ?? r.goals_for_total ?? null;
      if (key === 'ga') return r.goals_against ?? r.goals_conceded ?? r.goals?.against ?? r.goals_against_total ?? null;
      return null;
    }

    const htmlRows = rows.map(r=>{
      const pos = r.position ?? r.rank ?? r.pos ?? '';
      const team = r.participant || r.team || r;
      const name = team.name || team.short_code || '—';
      const logo = team.image_path || team.logo_path || '';
      const p = pickStat(r,'played') ?? '';
      const w = pickStat(r,'won') ?? '';
      const d = pickStat(r,'draw') ?? '';
      const l = pickStat(r,'lost') ?? '';
      const gf = pickStat(r,'gf');
      const ga = pickStat(r,'ga');
      const gd = (gf!=null && ga!=null) ? (Number(gf)-Number(ga)) : (r.goal_difference ?? r.gd ?? '');
      const pts = r.points ?? r.pts ?? '';

      return `
        <tr>
          <td>
            <div class="ss-lh-teamcell">
              <span class="ss-lh-pos">${esc(pos)}</span>
              ${logo ? `<img src="${esc(logo)}" alt="">` : ``}
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(name)}</span>
            </div>
          </td>
          <td>${esc(p)}</td>
          <td>${esc(w)}</td>
          <td>${esc(d)}</td>
          <td>${esc(l)}</td>
          <td>${esc(gd)}</td>
          <td class="ss-lh-pts">${esc(pts)}</td>
        </tr>
      `;
    }).join('');

    $box.html(`
      <table class="ss-lh-table">
        <thead>
          <tr>
            <th>${esc(I18N.team || 'Team')}</th>
            <th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>PTS</th>
          </tr>
        </thead>
        <tbody>${htmlRows}</tbody>
      </table>
    `);
  }

  function renderTopPlayers($root, items){
    const $box = $root.find('.ss-lh-topplayers-body');
    if (!items.length){
      $box.html(`<div class="ss-muted">${esc(I18N.noData || 'No data available.')}</div>`);
      return;
    }
    const rows = items.slice(0,5).map((it, idx)=>{
      const player = it.player || it.participant || it;
      const team = it.team || it.participant_team || it.team_participant || null;
      const name = player.name || '—';
      const photo = player.image_path || player.photo_path || '';
      const teamName = team?.name || it.team_name || '';
      const total = it.total ?? it.value ?? it.goals ?? it.assists ?? 0;

      return `
        <div class="ss-lh-player">
          <div class="ss-lh-player-left">
            ${photo ? `<img src="${esc(photo)}" alt="">` : `<span class="ss-lh-pos">${idx+1}</span>`}
            <div style="min-width:0">
              <div class="ss-lh-player-name">${esc(name)}</div>
              <div class="ss-lh-player-team">${esc(teamName)}</div>
            </div>
          </div>
          <div class="ss-lh-player-total">${esc(total)}</div>
        </div>
      `;
    }).join('');
    $box.html(`<div class="ss-lh-topplayers-list">${rows}</div>`);
  }

  async function apiGet(path){
    const url = REST ? `${REST}${path}` : path;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  }

  async function load($root){
    const leagueId = Number($root.data('league-id')||0);
    const seasonId = Number($root.data('season-id')||0);
    const date = String($root.data('current-date') || $root.data('default-date') || '').trim() || (new Date()).toISOString().slice(0,10);

    $root.data('current-date', date);
    $root.find('.ss-lh-date').text(date);

    // Fixtures for date (filter league client-side)
    const fixturesRes = await apiGet(`/fixtures?date=${encodeURIComponent(date)}`);
    const fixtures = (fixturesRes && fixturesRes.data && Array.isArray(fixturesRes.data)) ? fixturesRes.data : (Array.isArray(fixturesRes) ? fixturesRes : (fixturesRes.data?.data || []));
    const leagueFixtures = leagueId ? fixtures.filter(f => Number(f?.league_id) === leagueId) : fixtures;

    // Standings
    let standingsRows = [];
    if (seasonId){
      const standingsRes = await apiGet(`/standings/${encodeURIComponent(seasonId)}`);
      const d = standingsRes?.data ?? standingsRes;
      if (Array.isArray(d)) standingsRows = d;
      else if (Array.isArray(d?.data)) standingsRows = d.data;
      else if (Array.isArray(d?.standings)) standingsRows = d.standings;
      else if (Array.isArray(d?.groups?.[0]?.standings)) standingsRows = d.groups[0].standings;
    }

    // Top players (goals default)
    const type = $root.find('.ss-lh-topplayers .ss-tab-active').data('type') || 'goals';
    let topPlayers = [];
    if (seasonId){
      const tpRes = await apiGet(`/topscorers/${encodeURIComponent(seasonId)}?type=${encodeURIComponent(type)}`);
      const d = tpRes?.data ?? tpRes;
      topPlayers = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
    }

    // Render
    renderFeatured($root, pickFeatured(leagueFixtures));
    const filter = $root.data('filter') || 'all';
    const q = $root.data('q') || '';
    renderMatches($root, leagueFixtures, filter, q);

    const scope = $root.data('standings-scope') || 'all';
    renderStandings($root, standingsRows, scope);

    renderTopPlayers($root, topPlayers);
  }

  function init($root){
    // initial placeholders already in HTML
    $root.data('filter', 'all');
    $root.data('standings-scope', 'all');
    $root.data('q','');

    const doLoad = async ()=>{
      try{
        await load($root);
      }catch(e){
        console.error(e);
        $root.find('.ss-lh-featured-body, .ss-lh-matches-list, .ss-lh-standings-body, .ss-lh-topplayers-body')
             .html(`<div class="ss-muted">${esc(I18N.dataErr || 'Unable to load data.')}</div>`);
      }
    };

    // Filter pills
    $root.on('click', '.ss-lh-matches .ss-pill', function(){
      $root.find('.ss-lh-matches .ss-pill').removeClass('ss-pill-active');
      $(this).addClass('ss-pill-active');
      $root.data('filter', $(this).data('filter'));
      doLoad();
    });

    // Search
    let t=null;
    $root.on('input', '.ss-lh-search-input', function(){
      const val = $(this).val();
      clearTimeout(t);
      t=setTimeout(()=>{ $root.data('q', val||''); doLoad(); }, 150);
    });

    // Top players tabs
    $root.on('click', '.ss-lh-topplayers .ss-tab', function(){
      $root.find('.ss-lh-topplayers .ss-tab').removeClass('ss-tab-active');
      $(this).addClass('ss-tab-active');
      doLoad();
    });

    // Standings scope
    $root.on('click', '.ss-lh-standings .ss-tab', function(){
      $root.find('.ss-lh-standings .ss-tab').removeClass('ss-tab-active');
      $(this).addClass('ss-tab-active');
      $root.data('standings-scope', $(this).data('scope'));
      doLoad();
    });

    // Refresh
    $root.on('click', '.ss-lh-refresh', function(){ doLoad(); });

    doLoad();
  }

  $(function(){
    $('.ss-league-hub').each(function(){ init($(this)); });
  });

})(jQuery);
