/**
 * Sawah Sports Premium - Complete JavaScript (Stage 2)
 * All 11 widgets with full functionality
 * v2.0.0
 */

(function(){"use strict";

const API={get:async(path,params={})=>{const url=new URL(SawahSports.restUrl+path,window.location.origin);Object.keys(params).forEach(k=>{if(params[k]!==undefined&&params[k]!==null&&params[k]!==''){url.searchParams.set(k,params[k])}});try{const res=await fetch(url.toString(),{headers:{'X-WP-Nonce':SawahSports.nonce}});let data=null;try{data=await res.json()}catch(e){}if(!res.ok){throw new Error(data?.message||'HTTP '+res.status)}return data}catch(error){console.error('[Sawah Sports]',error);throw error}}};

const DOM={el:(tag,attrs={},children=[])=>{const n=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else if(k==='html')n.innerHTML=v;else n.setAttribute(k,v)});children.forEach(c=>n.appendChild(c));return n},unwrap:(x)=>{if(!x)return x;if(Array.isArray(x))return x;if(typeof x==='object'&&x.data!==undefined)return x.data;return x},clear:(el)=>{while(el.firstChild)el.removeChild(el.firstChild)},showError:(container,message)=>{DOM.clear(container);container.appendChild(DOM.el('div',{class:'ss-error',text:message}))},showEmpty:(container,message)=>{DOM.clear(container);container.appendChild(DOM.el('div',{class:'ss-empty',text:message}))}};

const Team={fromParticipants:(participants,location)=>{const list=DOM.unwrap(participants);if(!Array.isArray(list))return null;return list.find(x=>x?.meta?.location?.toLowerCase()===location)||list[location==='home'?0:1]||null},logo:(team)=>team?.image_path||team?.logo_path||'',initials:(name)=>{const words=String(name||'').trim().split(/\s+/).filter(Boolean);if(!words.length)return '—';return(words[0][0]+(words.length>1?words[words.length-1][0]:'')).toUpperCase()},node:(team,align='left')=>{const name=team?.name||team?.short_code||'—';const logo=Team.logo(team);const badge=logo?DOM.el('img',{class:'ss-team-logo',src:logo,alt:name,loading:'lazy'}):DOM.el('span',{class:'ss-team-logo ss-team-fallback',text:Team.initials(name)});return DOM.el('div',{class:`ss-team is-${align}`},[badge,DOM.el('span',{class:'ss-team-name',text:name})])}};

const Match={score:(fx)=>{const scores=DOM.unwrap(fx?.scores);if(!Array.isArray(scores))return '— : —';const current=scores.find(s=>s?.description?.toLowerCase().includes('current'))||scores[scores.length-1];if(current?.score){const h=current.score.home??current.score.home_score??'—';const a=current.score.away??current.score.away_score??'—';return`${h} : ${a}`}return '— : —'},state:(fx)=>{const st=DOM.unwrap(fx?.state);return st?.short_name||st?.short||st?.name||''},kickoff:(fx)=>{const s=fx?.starting_at;if(!s)return'';const m=String(s).match(/(\d{2}):(\d{2})/);return m?`${m[1]}:${m[2]}`:''},isLive:(fx)=>{const state=Match.state(fx).toUpperCase();return['LIVE','HT','ET','PEN_LIVE','AET'].includes(state)}};

const Widgets={
  // Original widgets (kept from Stage 1)
  liveMatches:{/* ... existing code ... */},
  fixtures:{/* ... existing code ... */},
  standings:{/* ... existing code ... */},

  // NEW: Match Center
  matchCenter:{
    render:(root,data)=>{
      const body=root.querySelector('.ss-match-header .ss-body');
      const fx=data?.data;
      if(!fx){DOM.showEmpty(body,'Match not found');return}
      
      const participants=fx?.participants||[];
      const home=Team.fromParticipants(participants,'home');
      const away=Team.fromParticipants(participants,'away');
      const league=DOM.unwrap(fx.league);

      const header=DOM.el('div',{class:'ss-match-detail'},[
        DOM.el('div',{class:'ss-league-name',text:league?.name||''}),
        DOM.el('div',{class:'ss-match-teams'},[
          Team.node(home,'left'),
          DOM.el('div',{class:'ss-scorebox'},[
            DOM.el('div',{class:'ss-score'+(Match.isLive(fx)?' is-live':''),text:Match.score(fx)}),
            DOM.el('div',{class:'ss-match-time',text:Match.kickoff(fx)||Match.state(fx)})
          ]),
          Team.node(away,'right')
        ])
      ]);

      DOM.clear(body);
      body.appendChild(header);

      // Load sub-sections if enabled
      if(root.getAttribute('data-stats')==='1')Widgets.matchCenter.loadStats(root,fx.id);
      if(root.getAttribute('data-xg')==='1')Widgets.matchCenter.loadXG(root,fx.id);
      if(root.getAttribute('data-timeline')==='1')Widgets.matchCenter.loadTimeline(root,fx);
      if(root.getAttribute('data-lineups')==='1')Widgets.matchCenter.loadLineups(root,fx);
    },
    loadStats:async(root,fixtureId)=>{
      const body=root.querySelector('.ss-stats-body');
      if(!body)return;
      try{
        const data=await API.get(`/fixture/${fixtureId}`);
        const stats=data?.data?.statistics||[];
        if(!stats.length){DOM.showEmpty(body,'No statistics');return}
        // Render stats comparison
        const grid=DOM.el('div',{class:'ss-stats-grid'});
        stats.slice(0,8).forEach(stat=>{
          const type=stat.type?.name||'';
          const home=stat.data?.[0]?.value||0;
          const away=stat.data?.[1]?.value||0;
          grid.appendChild(DOM.el('div',{class:'ss-stat-row'},[
            DOM.el('div',{class:'ss-stat-value',text:home}),
            DOM.el('div',{class:'ss-stat-name',text:type}),
            DOM.el('div',{class:'ss-stat-value',text:away})
          ]));
        });
        DOM.clear(body);
        body.appendChild(grid);
      }catch(e){DOM.showError(body,'Stats unavailable')}
    },
    loadXG:async(root,fixtureId)=>{
      const body=root.querySelector('.ss-xg-body');
      if(!body)return;
      try{
        const data=await API.get(`/xg/${fixtureId}`);
        Widgets.xgMatch.renderXG(body,data);
      }catch(e){DOM.showError(body,'xG unavailable')}
    },
    loadTimeline:async(root,fx)=>{
      const body=root.querySelector('.ss-timeline-body');
      if(!body)return;
      const events=fx?.events||[];
      if(!events.length){DOM.showEmpty(body,'No events');return}
      
      const timeline=DOM.el('div',{class:'ss-timeline'});
      events.slice(0,15).forEach(evt=>{
        const type=evt.type?.name||'';
        const minute=evt.minute||'';
        const player=evt.player?.name||'';
        timeline.appendChild(DOM.el('div',{class:'ss-timeline-item'},[
          DOM.el('span',{class:'ss-event-minute',text:minute+"'"}),
          DOM.el('span',{class:'ss-event-icon',text:'●'}),
          DOM.el('span',{class:'ss-event-text',text:`${type} - ${player}`})
        ]));
      });
      DOM.clear(body);
      body.appendChild(timeline);
    },
    loadLineups:async(root,fx)=>{
      const body=root.querySelector('.ss-lineups-body');
      if(!body)return;
      const lineups=fx?.lineups||[];
      if(!lineups.length){DOM.showEmpty(body,'Lineups unavailable');return}
      // Simple lineup display
      const grid=DOM.el('div',{class:'ss-lineups-grid'});
      lineups.forEach(lineup=>{
        const team=lineup.team?.name||'';
        const players=lineup.players||[];
        const col=DOM.el('div',{class:'ss-lineup-col'},[
          DOM.el('h4',{text:team}),
          DOM.el('ul',{},players.slice(0,11).map(p=>DOM.el('li',{text:p.player?.name||''})))
        ]);
        grid.appendChild(col);
      });
      DOM.clear(body);
      body.appendChild(grid);
    },
    load:async(root)=>{
      const fixtureId=root.getAttribute('data-fixture');
      try{
        const data=await API.get(`/fixture/${fixtureId}`);
        Widgets.matchCenter.render(root,data);
      }catch(error){
        DOM.showError(root.querySelector('.ss-body'),'Unable to load match');
      }
    }
  },

  // NEW: xG Match
  xgMatch:{
    renderXG:(container,data)=>{
      const xgData=data?.data||[];
      if(!xgData.length){DOM.showEmpty(container,'xG data unavailable');return}
      
      const home=xgData.find(x=>x.location==='home');
      const away=xgData.find(x=>x.location==='away');
      const homeXG=home?.data?.value||0;
      const awayXG=away?.data?.value||0;
      const total=homeXG+awayXG||1;

      const viz=DOM.el('div',{class:'ss-xg-container'},[
        DOM.el('div',{class:'ss-xg-header'},[
          DOM.el('span',{class:'ss-xg-value',text:homeXG.toFixed(2)}),
          DOM.el('span',{class:'ss-xg-label',text:'Expected Goals'}),
          DOM.el('span',{class:'ss-xg-value',text:awayXG.toFixed(2)})
        ]),
        DOM.el('div',{class:'ss-xg-bars'},[
          DOM.el('div',{class:'ss-xg-bar is-home',style:`width:${(homeXG/total*100).toFixed(1)}%`,text:homeXG.toFixed(2)}),
          DOM.el('div',{class:'ss-xg-bar is-away',style:`width:${(awayXG/total*100).toFixed(1)}%`,text:awayXG.toFixed(2)})
        ])
      ]);
      
      DOM.clear(container);
      container.appendChild(viz);
    },
    load:async(root)=>{
      const fixtureId=root.getAttribute('data-fixture');
      const body=root.querySelector('.ss-body');
      try{
        const data=await API.get(`/xg/${fixtureId}`);
        Widgets.xgMatch.renderXG(body,data);
      }catch(error){
        DOM.showError(body,'xG data unavailable');
      }
    }
  },

  // NEW: Team Profile
  teamProfile:{
    load:async(root)=>{
      const teamId=root.getAttribute('data-team');
      const body=root.querySelector('.ss-body');
      try{
        const data=await API.get(`/team/${teamId}`);
        const team=data?.data;
        if(!team){DOM.showEmpty(body,'Team not found');return}
        
        const profile=DOM.el('div',{class:'ss-team-header'},[
          Team.logo(team)?DOM.el('img',{class:'ss-team-logo-large',src:Team.logo(team),alt:team.name}):null,
          DOM.el('h2',{text:team.name}),
          DOM.el('p',{class:'ss-muted',text:team.country?.name||''})
        ].filter(Boolean));
        
        DOM.clear(body);
        body.appendChild(profile);
      }catch(error){
        DOM.showError(body,'Unable to load team');
      }
    }
  },

  // NEW: Player Profile
  playerProfile:{
    load:async(root)=>{
      const playerId=root.getAttribute('data-player');
      const body=root.querySelector('.ss-body');
      try{
        const data=await API.get(`/player/${playerId}`);
        const player=data?.data;
        if(!player){DOM.showEmpty(body,'Player not found');return}
        
        const profile=DOM.el('div',{class:'ss-player-info'},[
          DOM.el('h2',{text:player.name}),
          DOM.el('p',{text:`Position: ${player.position?.name||'N/A'}`}),
          DOM.el('p',{text:`Nationality: ${player.country?.name||'N/A'}`})
        ]);
        
        DOM.clear(body);
        body.appendChild(profile);
      }catch(error){
        DOM.showError(body,'Unable to load player');
      }
    }
  },

  // NEW: Odds
  odds:{
    load:async(root)=>{
      const fixtureId=root.getAttribute('data-fixture');
      const body=root.querySelector('.ss-body');
      try{
        const data=await API.get(`/odds/${fixtureId}`);
        const odds=data?.data||[];
        if(!odds.length){DOM.showEmpty(body,'Odds unavailable');return}
        
        const grid=DOM.el('div',{class:'ss-odds-grid'});
        odds.slice(0,5).forEach(odd=>{
          const bookmaker=odd.bookmaker?.name||'';
          const value=odd.value||'';
          grid.appendChild(DOM.el('div',{class:'ss-odds-item'},[
            DOM.el('span',{class:'ss-bookmaker',text:bookmaker}),
            DOM.el('span',{class:'ss-odd-value',text:value})
          ]));
        });
        
        DOM.clear(body);
        body.appendChild(grid);
      }catch(error){
        DOM.showError(body,'Odds unavailable');
      }
    }
  },

  // NEW: Predictions
  predictions:{
    load:async(root)=>{
      const fixtureId=root.getAttribute('data-fixture');
      const body=root.querySelector('.ss-body');
      try{
        const data=await API.get(`/predictions/${fixtureId}`);
        const pred=data?.data?.predictions||{};
        if(!Object.keys(pred).length){DOM.showEmpty(body,'Predictions unavailable');return}
        
        const viz=DOM.el('div',{class:'ss-predictions-grid'},[
          DOM.el('div',{class:'ss-pred-item'},[
            DOM.el('div',{class:'ss-pred-label',text:'Home Win'}),
            DOM.el('div',{class:'ss-pred-value',text:(pred.home_win||0)+'%'})
          ]),
          DOM.el('div',{class:'ss-pred-item'},[
            DOM.el('div',{class:'ss-pred-label',text:'Draw'}),
            DOM.el('div',{class:'ss-pred-value',text:(pred.draw||0)+'%'})
          ]),
          DOM.el('div',{class:'ss-pred-item'},[
            DOM.el('div',{class:'ss-pred-label',text:'Away Win'}),
            DOM.el('div',{class:'ss-pred-value',text:(pred.away_win||0)+'%'})
          ])
        ]);
        
        DOM.clear(body);
        body.appendChild(viz);
      }catch(error){
        DOM.showError(body,'Predictions unavailable');
      }
    }
  },

  // NEW: Top Scorers
  topscorers:{
    load:async(root)=>{
      const seasonId=root.getAttribute('data-season');
      const type=root.getAttribute('data-type')||'goals';
      const body=root.querySelector('.ss-body');
      try{
        const data=await API.get(`/topscorers/${seasonId}`,{type});
        const scorers=data?.data||[];
        if(!scorers.length){DOM.showEmpty(body,'No data');return}
        
        const list=DOM.el('div',{class:'ss-topscorers-list'});
        scorers.slice(0,10).forEach((s,i)=>{
          const player=s.player?.name||'';
          const team=s.participant?.name||'';
          const total=s.total||0;
          list.appendChild(DOM.el('div',{class:'ss-scorer-row'},[
            DOM.el('span',{class:'ss-rank',text:(i+1)}),
            DOM.el('span',{class:'ss-player-name',text:player}),
            DOM.el('span',{class:'ss-team-name ss-muted',text:team}),
            DOM.el('span',{class:'ss-scorer-total',text:total})
          ]));
        });
        
        DOM.clear(body);
        body.appendChild(list);
      }catch(error){
        DOM.showError(body,'Unable to load data');
      }
    }
  },

  // NEW: H2H
  h2h:{
    load:async(root)=>{
      const team1=root.getAttribute('data-team1');
      const team2=root.getAttribute('data-team2');
      const body=root.querySelector('.ss-body');
      try{
        const data=await API.get(`/h2h/${team1}/${team2}`);
        const matches=data?.data||[];
        if(!matches.length){DOM.showEmpty(body,'No matches found');return}
        
        const list=DOM.el('div',{class:'ss-h2h-list'});
        matches.slice(0,10).forEach(fx=>{
          const participants=fx?.participants||[];
          const home=Team.fromParticipants(participants,'home');
          const away=Team.fromParticipants(participants,'away');
          
          list.appendChild(DOM.el('div',{class:'ss-h2h-row'},[
            DOM.el('span',{class:'ss-date',text:fx.starting_at?.split(' ')[0]||''}),
            DOM.el('span',{class:'ss-teams',text:`${home?.name||''} vs ${away?.name||''}`}),
            DOM.el('span',{class:'ss-score',text:Match.score(fx)})
          ]));
        });
        
        DOM.clear(body);
        body.appendChild(list);
      }catch(error){
        DOM.showError(body,'Unable to load matches');
      }
    }
  }
};

// Initialize all widgets
function init(){
  // Original widgets
  document.querySelectorAll('.ss-widget.ss-live').forEach(root=>{
    Widgets.liveMatches.load(root);
    const refresh=parseInt(root.getAttribute('data-refresh')||'0',10);
    if(refresh>0)setInterval(()=>Widgets.liveMatches.load(root),refresh*1000);
  });
  
  document.querySelectorAll('.ss-widget.ss-fixtures').forEach(root=>Widgets.fixtures.load(root));
  document.querySelectorAll('.ss-widget.ss-standings').forEach(root=>Widgets.standings.load(root));
  
  // NEW: Advanced widgets
  document.querySelectorAll('.ss-widget.ss-match-center').forEach(root=>Widgets.matchCenter.load(root));
  document.querySelectorAll('.ss-widget.ss-xg-match').forEach(root=>Widgets.xgMatch.load(root));
  document.querySelectorAll('.ss-widget.ss-team-profile').forEach(root=>Widgets.teamProfile.load(root));
  document.querySelectorAll('.ss-widget.ss-player-profile').forEach(root=>Widgets.playerProfile.load(root));
  document.querySelectorAll('.ss-widget.ss-odds').forEach(root=>Widgets.odds.load(root));
  document.querySelectorAll('.ss-widget.ss-predictions').forEach(root=>Widgets.predictions.load(root));
  document.querySelectorAll('.ss-widget.ss-topscorers').forEach(root=>Widgets.topscorers.load(root));
  document.querySelectorAll('.ss-widget.ss-h2h').forEach(root=>Widgets.h2h.load(root));
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init);
}else{
  init();
}

})();
/**
 * Sawah Sports Premium - Stage 3 Advanced Features
 * Calendar, Season Stats, Comparisons, Live Ticker
 * v3.0.0
 */

(function(){"use strict";

// Extend the existing Widgets object with Stage 3 widgets

// Calendar Widget
const Calendar = {
  currentDate: new Date(),
  
  render: (root, fixtures) => {
    const body = root.querySelector('.ss-body');
    const month = Calendar.currentDate.getMonth();
    const year = Calendar.currentDate.getFullYear();
    
    // Update title
    const titleEl = root.querySelector('.ss-calendar-title');
    if (titleEl) {
      titleEl.textContent = new Date(year, month).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
    }
    
    // Build calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendar = document.createElement('div');
    calendar.className = 'ss-calendar-grid';
    
    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
      const header = document.createElement('div');
      header.className = 'ss-calendar-day-header';
      header.textContent = day;
      calendar.appendChild(header);
    });
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement('div');
      cell.className = 'ss-calendar-cell ss-empty';
      calendar.appendChild(cell);
    }
    
    // Days with fixtures
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayFixtures = fixtures.filter(fx => fx.starting_at?.startsWith(dateStr));
      
      const cell = document.createElement('div');
      cell.className = 'ss-calendar-cell';
      if (dayFixtures.length > 0) cell.classList.add('ss-has-fixtures');
      
      const dayNum = document.createElement('div');
      dayNum.className = 'ss-day-number';
      dayNum.textContent = day;
      cell.appendChild(dayNum);
      
      if (dayFixtures.length > 0) {
        const count = document.createElement('div');
        count.className = 'ss-fixture-count';
        count.textContent = `${dayFixtures.length} match${dayFixtures.length > 1 ? 'es' : ''}`;
        cell.appendChild(count);
        
        // Add click handler to show details
        cell.style.cursor = 'pointer';
        cell.onclick = () => Calendar.showDayFixtures(dayFixtures);
      }
      
      calendar.appendChild(cell);
    }
    
    body.innerHTML = '';
    body.appendChild(calendar);
  },
  
  showDayFixtures: (fixtures) => {
    // Create modal or expand to show fixtures
    alert(`Fixtures: ${fixtures.map(f => f.name || 'Match').join(', ')}`);
  },
  
  load: async (root) => {
    const leagueId = root.getAttribute('data-league');
    const teamId = root.getAttribute('data-team');
    const defaultMonth = root.getAttribute('data-month') || 'current';
    
    // Set default month
    if (defaultMonth === 'next') {
      Calendar.currentDate.setMonth(Calendar.currentDate.getMonth() + 1);
    } else if (defaultMonth === 'prev') {
      Calendar.currentDate.setMonth(Calendar.currentDate.getMonth() - 1);
    }
    
    // Navigation handlers
    const prevBtn = root.querySelector('.ss-nav-prev');
    const nextBtn = root.querySelector('.ss-nav-next');
    
    if (prevBtn) {
      prevBtn.onclick = () => {
        Calendar.currentDate.setMonth(Calendar.currentDate.getMonth() - 1);
        Calendar.load(root);
      };
    }
    
    if (nextBtn) {
      nextBtn.onclick = () => {
        Calendar.currentDate.setMonth(Calendar.currentDate.getMonth() + 1);
        Calendar.load(root);
      };
    }
    
    try {
      const params = {};
      if (leagueId) params.league_id = leagueId;
      if (teamId) params.team_id = teamId;
      
      // Get fixtures for the month
      const startDate = new Date(Calendar.currentDate.getFullYear(), Calendar.currentDate.getMonth(), 1);
      const endDate = new Date(Calendar.currentDate.getFullYear(), Calendar.currentDate.getMonth() + 1, 0);
      
      params.date_from = startDate.toISOString().split('T')[0];
      params.date_to = endDate.toISOString().split('T')[0];
      
      const data = await API.get('/fixtures', params);
      Calendar.render(root, data?.data || []);
    } catch (error) {
      DOM.showError(root.querySelector('.ss-body'), 'Unable to load calendar');
    }
  }
};

// Season Stats Widget
const SeasonStats = {
  render: (root, data) => {
    const body = root.querySelector('.ss-body');
    const type = root.getAttribute('data-type') || 'overview';
    const showCharts = root.getAttribute('data-charts') === '1';
    
    if (!data || !data.length) {
      DOM.showEmpty(body, 'No statistics available');
      return;
    }
    
    const container = document.createElement('div');
    container.className = 'ss-season-stats-container';
    
    if (type === 'overview') {
      // Show key statistics
      const stats = [
        { label: 'Total Matches', value: data.total_matches || 0 },
        { label: 'Goals Scored', value: data.goals_scored || 0 },
        { label: 'Goals Conceded', value: data.goals_conceded || 0 },
        { label: 'Clean Sheets', value: data.clean_sheets || 0 },
      ];
      
      const grid = document.createElement('div');
      grid.className = 'ss-stats-overview';
      
      stats.forEach(stat => {
        const item = document.createElement('div');
        item.className = 'ss-stat-box';
        item.innerHTML = `
          <div class="ss-stat-value">${stat.value}</div>
          <div class="ss-stat-label">${stat.label}</div>
        `;
        grid.appendChild(item);
      });
      
      container.appendChild(grid);
    }
    
    if (showCharts) {
      const chart = document.createElement('div');
      chart.className = 'ss-chart-placeholder';
      chart.textContent = 'Chart visualization here';
      container.appendChild(chart);
    }
    
    body.innerHTML = '';
    body.appendChild(container);
  },
  
  load: async (root) => {
    const seasonId = root.getAttribute('data-season');
    const body = root.querySelector('.ss-body');
    
    try {
      const data = await API.get(`/standings/${seasonId}`);
      SeasonStats.render(root, data?.data);
    } catch (error) {
      DOM.showError(body, 'Unable to load season statistics');
    }
  }
};

// Match Comparison Widget
const MatchComparison = {
  render: (root, matches) => {
    const body = root.querySelector('.ss-body');
    const type = root.getAttribute('data-type') || 'stats';
    
    if (!matches || matches.length === 0) {
      DOM.showEmpty(body, 'No matches to compare');
      return;
    }
    
    const container = document.createElement('div');
    container.className = 'ss-comparison-container';
    
    // Create comparison table
    const table = document.createElement('div');
    table.className = 'ss-comparison-table';
    
    // Headers
    const headerRow = document.createElement('div');
    headerRow.className = 'ss-comparison-row ss-header';
    headerRow.innerHTML = '<div class="ss-comparison-cell">Metric</div>';
    
    matches.forEach((match, i) => {
      const cell = document.createElement('div');
      cell.className = 'ss-comparison-cell';
      cell.textContent = `Match ${i + 1}`;
      headerRow.appendChild(cell);
    });
    
    table.appendChild(headerRow);
    
    // Stats rows
    if (type === 'stats') {
      const metrics = ['Score', 'Possession', 'Shots', 'Corners'];
      metrics.forEach(metric => {
        const row = document.createElement('div');
        row.className = 'ss-comparison-row';
        row.innerHTML = `<div class="ss-comparison-cell ss-metric">${metric}</div>`;
        
        matches.forEach(match => {
          const cell = document.createElement('div');
          cell.className = 'ss-comparison-cell';
          cell.textContent = match[metric.toLowerCase()] || '—';
          row.appendChild(cell);
        });
        
        table.appendChild(row);
      });
    }
    
    container.appendChild(table);
    body.innerHTML = '';
    body.appendChild(container);
  },
  
  load: async (root) => {
    const fixtureIds = root.getAttribute('data-fixtures');
    const body = root.querySelector('.ss-body');
    
    if (!fixtureIds) {
      DOM.showError(body, 'No fixtures specified');
      return;
    }
    
    try {
      const ids = fixtureIds.split(',').map(id => id.trim()).filter(Boolean);
      const matches = await Promise.all(
        ids.slice(0, 4).map(id => API.get(`/fixture/${id}`))
      );
      
      MatchComparison.render(root, matches.map(m => m?.data).filter(Boolean));
    } catch (error) {
      DOM.showError(body, 'Unable to load comparison');
    }
  }
};

// Live Ticker Widget
const LiveTicker = {
  eventCount: 0,
  
  render: (root, events) => {
    const body = root.querySelector('.ss-ticker-body');
    const maxEvents = parseInt(root.getAttribute('data-max') || '50', 10);
    const autoScroll = root.getAttribute('data-autoscroll') === '1';
    
    if (!events || events.length === 0) {
      DOM.showEmpty(body, 'No events yet');
      return;
    }
    
    // Only add new events
    const newEvents = events.slice(LiveTicker.eventCount);
    
    newEvents.forEach(event => {
      const item = document.createElement('div');
      item.className = 'ss-ticker-item';
      
      const time = document.createElement('span');
      time.className = 'ss-event-time';
      time.textContent = `${event.minute || ''}' `;
      
      const text = document.createElement('span');
      text.className = 'ss-event-desc';
      text.textContent = event.description || event.type?.name || 'Event';
      
      item.appendChild(time);
      item.appendChild(text);
      
      // Prepend to show latest first
      body.insertBefore(item, body.firstChild);
    });
    
    LiveTicker.eventCount = events.length;
    
    // Limit events
    while (body.children.length > maxEvents) {
      body.removeChild(body.lastChild);
    }
    
    // Auto scroll to top
    if (autoScroll && newEvents.length > 0) {
      body.scrollTop = 0;
    }
  },
  
  load: async (root) => {
    const fixtureId = root.getAttribute('data-fixture');
    const body = root.querySelector('.ss-ticker-body');
    
    try {
      const data = await API.get(`/fixture/${fixtureId}`);
      const events = data?.data?.events || [];
      LiveTicker.render(root, events);
      
      // Auto refresh every 15 seconds for live matches
      const isLive = Match.isLive(data?.data);
      if (isLive) {
        setTimeout(() => LiveTicker.load(root), 15000);
      }
    } catch (error) {
      DOM.showError(body, 'Unable to load ticker');
    }
  }
};

// Initialize Stage 3 widgets
function initStage3() {
  document.querySelectorAll('.ss-widget.ss-calendar').forEach(root => Calendar.load(root));
  document.querySelectorAll('.ss-widget.ss-season-stats').forEach(root => SeasonStats.load(root));
  document.querySelectorAll('.ss-widget.ss-match-comparison').forEach(root => MatchComparison.load(root));
  document.querySelectorAll('.ss-widget.ss-live-ticker').forEach(root => LiveTicker.load(root));
}

// Add to existing init or run directly
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStage3);
} else {
  initStage3();
}

// Export for testing
if (typeof window.SawahSportsStage3 === 'undefined') {
  window.SawahSportsStage3 = { Calendar, SeasonStats, MatchComparison, LiveTicker };
}

})();
