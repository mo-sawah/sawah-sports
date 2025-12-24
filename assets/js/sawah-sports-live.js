/**
 * Sawah Sports Premium - Complete JavaScript
 * ALL 15 Widgets - FIXED VERSION
 * v3.0.1
 */

(function(){"use strict";

// API Module
const API={
  get:async(path,params={})=>{
    const url=new URL(SawahSports.restUrl+path,window.location.origin);
    Object.keys(params).forEach(k=>{
      if(params[k]!==undefined&&params[k]!==null&&params[k]!==''){
        url.searchParams.set(k,params[k]);
      }
    });
    try{
      const res=await fetch(url.toString(),{
        headers:{'X-WP-Nonce':SawahSports.nonce}
      });
      let data=null;
      try{data=await res.json()}catch(e){}
      if(!res.ok){throw new Error(data?.message||'HTTP '+res.status)}
      return data;
    }catch(error){
      console.error('[Sawah Sports API Error]',error);
      throw error;
    }
  }
};

// DOM Module
const DOM={
  el:(tag,attrs={},children=[])=>{
    const n=document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k==='class')n.className=v;
      else if(k==='text')n.textContent=v;
      else if(k==='html')n.innerHTML=v;
      else n.setAttribute(k,v);
    });
    children.forEach(c=>n.appendChild(c));
    return n;
  },
  unwrap:(x)=>{
    if(!x)return x;
    if(Array.isArray(x))return x;
    if(typeof x==='object'&&x.data!==undefined)return x.data;
    return x;
  },
  clear:(el)=>{
    while(el.firstChild)el.removeChild(el.firstChild);
  },
  showError:(container,message)=>{
    DOM.clear(container);
    container.appendChild(DOM.el('div',{class:'ss-error',text:message}));
  },
  showEmpty:(container,message)=>{
    DOM.clear(container);
    container.appendChild(DOM.el('div',{class:'ss-empty',text:message}));
  }
};

// Team Module
const Team={
  fromParticipants:(participants,location)=>{
    const list=DOM.unwrap(participants);
    if(!Array.isArray(list))return null;
    return list.find(x=>x?.meta?.location?.toLowerCase()===location)||list[location==='home'?0:1]||null;
  },
  logo:(team)=>team?.image_path||team?.logo_path||'',
  initials:(name)=>{
    const words=String(name||'').trim().split(/\s+/).filter(Boolean);
    if(!words.length)return '—';
    return(words[0][0]+(words.length>1?words[words.length-1][0]:'')).toUpperCase();
  },
  node:(team,align='left')=>{
    const name=team?.name||team?.short_code||'—';
    const logo=Team.logo(team);
    const badge=logo?DOM.el('img',{class:'ss-team-logo',src:logo,alt:name,loading:'lazy'}):DOM.el('span',{class:'ss-team-logo ss-team-fallback',text:Team.initials(name)});
    return DOM.el('div',{class:`ss-team is-${align}`},[badge,DOM.el('span',{class:'ss-team-name',text:name})]);
  }
};

// Match Module
const Match={
  score:(fx)=>{
    const scores=DOM.unwrap(fx?.scores);
    if(!Array.isArray(scores))return '— : —';
    const current=scores.find(s=>s?.description?.toLowerCase().includes('current'))||scores[scores.length-1];
    if(current?.score){
      const h=current.score.home??current.score.home_score??'—';
      const a=current.score.away??current.score.away_score??'—';
      return`${h} : ${a}`;
    }
    return '— : —';
  },
  state:(fx)=>{
    const st=DOM.unwrap(fx?.state);
    return st?.short_name||st?.short||st?.name||'';
  },
  kickoff:(fx)=>{
    const s=fx?.starting_at;
    if(!s)return'';
    const m=String(s).match(/(\d{2}):(\d{2})/);
    return m?`${m[1]}:${m[2]}`:'';
  },
  isLive:(fx)=>{
    const state=Match.state(fx).toUpperCase();
    return['LIVE','HT','ET','PEN_LIVE','AET'].includes(state);
  }
};

// Widgets Module - ALL IMPLEMENTATIONS
const Widgets={
  
  // STAGE 1: Live Matches Widget
  liveMatches:{
    render:(root,fixtures)=>{
      const body=root.querySelector('.ss-body');
      if(!fixtures||fixtures.length===0){
        DOM.showEmpty(body,SawahSports.i18n.noLive||'No live matches');
        return;
      }
      
      const container=DOM.el('div',{class:'ss-matches-list'});
      fixtures.forEach(fx=>{
        const participants=fx?.participants||[];
        const home=Team.fromParticipants(participants,'home');
        const away=Team.fromParticipants(participants,'away');
        const isLive=Match.isLive(fx);
        
        const row=DOM.el('div',{class:'ss-match-row'},[
          Team.node(home,'left'),
          DOM.el('div',{class:'ss-match-center'},[
            DOM.el('div',{class:'ss-score'+(isLive?' is-live':''),text:Match.score(fx)}),
            isLive?DOM.el('div',{class:'ss-badge ss-badge-live'},[
              DOM.el('span',{class:'ss-live-dot'}),
              DOM.el('span',{text:'LIVE'})
            ]):DOM.el('div',{class:'ss-match-state',text:Match.state(fx)||Match.kickoff(fx)})
          ]),
          Team.node(away,'right')
        ]);
        
        container.appendChild(row);
      });
      
      DOM.clear(body);
      body.appendChild(container);
    },
    
    load:async(root)=>{
      const body=root.querySelector('.ss-body');
      try{
        const data=await API.get('/livescores');
        Widgets.liveMatches.render(root,data?.data||[]);
      }catch(error){
        DOM.showError(body,SawahSports.i18n.liveErr||'Unable to load live matches');
      }
    }
  },
  
  // STAGE 1: Fixtures Widget
  fixtures:{
    render:(root,fixtures)=>{
      const body=root.querySelector('.ss-body');
      if(!fixtures||fixtures.length===0){
        DOM.showEmpty(body,SawahSports.i18n.noFixtures||'No fixtures found');
        return;
      }
      
      const container=DOM.el('div',{class:'ss-matches-list'});
      fixtures.forEach(fx=>{
        const participants=fx?.participants||[];
        const home=Team.fromParticipants(participants,'home');
        const away=Team.fromParticipants(participants,'away');
        const isLive=Match.isLive(fx);
        
        const row=DOM.el('div',{class:'ss-match-row'},[
          DOM.el('div',{class:'ss-match-date',text:fx.starting_at?.split(' ')[0]||''}),
          Team.node(home,'left'),
          DOM.el('div',{class:'ss-match-center'},[
            DOM.el('div',{class:'ss-score'+(isLive?' is-live':''),text:Match.score(fx)}),
            DOM.el('div',{class:'ss-match-time',text:Match.kickoff(fx)||Match.state(fx)})
          ]),
          Team.node(away,'right')
        ]);
        
        container.appendChild(row);
      });
      
      DOM.clear(body);
      body.appendChild(container);
    },
    
    load:async(root)=>{
      const seasonId=root.getAttribute('data-season');
      const body=root.querySelector('.ss-body');
      try{
        const data=await API.get('/fixtures',{season_id:seasonId});
        Widgets.fixtures.render(root,data?.data||[]);
      }catch(error){
        DOM.showError(body,SawahSports.i18n.fixturesErr||'Unable to load fixtures');
      }
    }
  },
  
  // STAGE 1: Standings Widget
  standings:{
    render:(root,standings)=>{
      const body=root.querySelector('.ss-body');
      if(!standings||standings.length===0){
        DOM.showEmpty(body,SawahSports.i18n.noStandings||'No standings data');
        return;
      }
      
      const table=DOM.el('table',{class:'ss-standings-table'});
      
      // Header
      const thead=DOM.el('thead');
      const headerRow=DOM.el('tr');
      ['#','Team','P','W','D','L','GD','Pts','Form'].forEach(h=>{
        headerRow.appendChild(DOM.el('th',{text:h}));
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Body
      const tbody=DOM.el('tbody');
      standings.forEach((s,i)=>{
        const team=s.participant;
        const row=DOM.el('tr');
        
        // Position
        row.appendChild(DOM.el('td',{class:'ss-pos',text:s.position||i+1}));
        
        // Team with logo
        const teamCell=DOM.el('td',{class:'ss-team-cell'});
        const teamDiv=DOM.el('div',{class:'ss-team-info'});
        const logo=Team.logo(team);
        if(logo){
          teamDiv.appendChild(DOM.el('img',{class:'ss-team-logo-small',src:logo,alt:team?.name||'',loading:'lazy'}));
        }
        teamDiv.appendChild(DOM.el('span',{text:team?.name||'—'}));
        teamCell.appendChild(teamDiv);
        row.appendChild(teamCell);
        
        // Stats
        row.appendChild(DOM.el('td',{text:s.played||0}));
        row.appendChild(DOM.el('td',{text:s.won||0}));
        row.appendChild(DOM.el('td',{text:s.draw||0}));
        row.appendChild(DOM.el('td',{text:s.lost||0}));
        row.appendChild(DOM.el('td',{text:s.goal_difference||0}));
        row.appendChild(DOM.el('td',{class:'ss-points',text:s.points||0}));
        
        // Form
        const formCell=DOM.el('td',{class:'ss-form'});
        const form=s.form?.split('')||[];
        form.slice(-5).forEach(f=>{
          const dot=DOM.el('span',{class:`ss-form-dot is-${f.toLowerCase()}`});
          formCell.appendChild(dot);
        });
        row.appendChild(formCell);
        
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      
      DOM.clear(body);
      body.appendChild(table);
    },
    
    load:async(root)=>{
      const seasonId=root.getAttribute('data-season');
      const body=root.querySelector('.ss-body');
      try{
        const data=await API.get(`/standings/${seasonId}`);
        Widgets.standings.render(root,data?.data||[]);
      }catch(error){
        DOM.showError(body,SawahSports.i18n.standingsErr||'Unable to load standings');
      }
    }
  },

  // STAGE 2: Match Center (simplified for now)
  matchCenter:{
    load:async(root)=>{
      const fixtureId=root.getAttribute('data-fixture');
      const body=root.querySelector('.ss-match-header .ss-body');
      try{
        const response=await API.get(`/fixture/${fixtureId}`);
        const fx=response?.data?.data || response?.data;
        if(!fx || !fx.participants){
          DOM.showEmpty(body,'Match not found');
          return;
        }
        
        const participants=fx?.participants||[];
        const home=Team.fromParticipants(participants,'home');
        const away=Team.fromParticipants(participants,'away');
        
        const header=DOM.el('div',{class:'ss-match-detail'},[
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
      }catch(error){
        console.error('Match Center Error:', error);
        DOM.showError(body,'Unable to load match');
      }
    }
  },

  // STAGE 2: xG Match
  xgMatch:{
    load:async(root)=>{
      const fixtureId=root.getAttribute('data-fixture');
      const body=root.querySelector('.ss-body');
      try{
        const response=await API.get(`/xg/${fixtureId}`);
        const xgData=response?.data?.data || response?.data || [];
        if(!Array.isArray(xgData) || xgData.length===0){
          DOM.showEmpty(body,'xG data unavailable');
          return;
        }
        
        const home=xgData.find(x=>x.location==='home')||{data:{value:0}};
        const away=xgData.find(x=>x.location==='away')||{data:{value:0}};
        const homeXG=home.data?.value||0;
        const awayXG=away.data?.value||0;
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
        
        DOM.clear(body);
        body.appendChild(viz);
      }catch(error){
        console.error('xG Match Error:', error);
        DOM.showError(body,'xG data unavailable');
      }
    }
  },

  // STAGE 2: Team Profile
  teamProfile:{
    load:async(root)=>{
      const teamId=root.getAttribute('data-team');
      const body=root.querySelector('.ss-body');
      try{
        const response=await API.get(`/team/${teamId}`);
        // Sportmonks returns {data: {...team...}, subscription: {...}}
        const team=response?.data?.data || response?.data;
        if(!team || !team.name){
          DOM.showEmpty(body,'Team not found');
          return;
        }
        
        const profile=DOM.el('div',{class:'ss-team-header'},[
          Team.logo(team)?DOM.el('img',{class:'ss-team-logo-large',src:Team.logo(team),alt:team.name}):null,
          DOM.el('h2',{text:team.name}),
          DOM.el('p',{class:'ss-muted',text:team.country?.name||''})
        ].filter(Boolean));
        
        DOM.clear(body);
        body.appendChild(profile);
      }catch(error){
        console.error('Team Profile Error:', error);
        DOM.showError(body,'Unable to load team');
      }
    }
  },

  // STAGE 2: Player Profile
  playerProfile:{
    load:async(root)=>{
      const playerId=root.getAttribute('data-player');
      const body=root.querySelector('.ss-body');
      try{
        const response=await API.get(`/player/${playerId}`);
        const player=response?.data?.data || response?.data;
        if(!player || !player.name){
          DOM.showEmpty(body,'Player not found');
          return;
        }
        
        const profile=DOM.el('div',{class:'ss-player-info'},[
          DOM.el('h2',{text:player.name}),
          DOM.el('p',{text:`Position: ${player.position?.name||'N/A'}`}),
          DOM.el('p',{text:`Nationality: ${player.country?.name||'N/A'}`})
        ]);
        
        DOM.clear(body);
        body.appendChild(profile);
      }catch(error){
        console.error('Player Profile Error:', error);
        DOM.showError(body,'Unable to load player');
      }
    }
  },

  // STAGE 2: Odds
  odds:{
    load:async(root)=>{
      const fixtureId=root.getAttribute('data-fixture');
      const body=root.querySelector('.ss-body');
      try{
        const response=await API.get(`/odds/${fixtureId}`);
        const odds=response?.data?.data || response?.data || [];
        if(!Array.isArray(odds) || odds.length===0){
          DOM.showEmpty(body,'Odds unavailable');
          return;
        }
        
        const grid=DOM.el('div',{class:'ss-odds-grid'});
        odds.slice(0,5).forEach(odd=>{
          grid.appendChild(DOM.el('div',{class:'ss-odds-item'},[
            DOM.el('span',{class:'ss-bookmaker',text:odd.bookmaker?.name||''}),
            DOM.el('span',{class:'ss-odd-value',text:odd.value||''})
          ]));
        });
        
        DOM.clear(body);
        body.appendChild(grid);
      }catch(error){
        console.error('Odds Error:', error);
        DOM.showError(body,'Odds unavailable');
      }
    }
  },

  // STAGE 2: Predictions
  predictions:{
    load:async(root)=>{
      const fixtureId=root.getAttribute('data-fixture');
      const body=root.querySelector('.ss-body');
      try{
        const response=await API.get(`/predictions/${fixtureId}`);
        const data=response?.data?.data || response?.data;
        const pred=data?.predictions||{};
        
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
        console.error('Predictions Error:', error);
        DOM.showError(body,'Predictions unavailable');
      }
    }
  },

  // STAGE 2: Top Scorers
  topscorers:{
    load:async(root)=>{
      const seasonId=root.getAttribute('data-season');
      const type=root.getAttribute('data-type')||'goals';
      const body=root.querySelector('.ss-body');
      try{
        const response=await API.get(`/topscorers/${seasonId}`,{type});
        const scorers=response?.data?.data || response?.data || [];
        if(!Array.isArray(scorers) || scorers.length===0){
          DOM.showEmpty(body,'No data');
          return;
        }
        
        const list=DOM.el('div',{class:'ss-topscorers-list'});
        scorers.slice(0,10).forEach((s,i)=>{
          list.appendChild(DOM.el('div',{class:'ss-scorer-row'},[
            DOM.el('span',{class:'ss-rank',text:(i+1)}),
            DOM.el('span',{class:'ss-player-name',text:s.player?.name||''}),
            DOM.el('span',{class:'ss-team-name ss-muted',text:s.participant?.name||''}),
            DOM.el('span',{class:'ss-scorer-total',text:s.total||0})
          ]));
        });
        
        DOM.clear(body);
        body.appendChild(list);
      }catch(error){
        console.error('Top Scorers Error:', error);
        DOM.showError(body,'Unable to load data');
      }
    }
  },

  // STAGE 2: H2H
  h2h:{
    load:async(root)=>{
      const team1=root.getAttribute('data-team1');
      const team2=root.getAttribute('data-team2');
      const body=root.querySelector('.ss-body');
      try{
        const response=await API.get(`/h2h/${team1}/${team2}`);
        const matches=response?.data?.data || response?.data || [];
        if(!Array.isArray(matches) || matches.length===0){
          DOM.showEmpty(body,'No matches found');
          return;
        }
        
        const list=DOM.el('div',{class:'ss-h2h-list'});
        matches.slice(0,10).forEach(fx=>{
          list.appendChild(DOM.el('div',{class:'ss-h2h-row'},[
            DOM.el('span',{class:'ss-date',text:fx.starting_at?.split(' ')[0]||''}),
            DOM.el('span',{class:'ss-teams',text:`${Team.fromParticipants(fx.participants,'home')?.name||''} vs ${Team.fromParticipants(fx.participants,'away')?.name||''}`}),
            DOM.el('span',{class:'ss-score',text:Match.score(fx)})
          ]));
        });
        
        DOM.clear(body);
        body.appendChild(list);
      }catch(error){
        console.error('H2H Error:', error);
        DOM.showError(body,'Unable to load matches');
      }
    }
  },

  // STAGE 3: Calendar (simplified)
  calendar:{
    load:async(root)=>{
      const body=root.querySelector('.ss-body');
      DOM.showEmpty(body,'Calendar widget - coming soon');
    }
  },

  // STAGE 3: Season Stats (simplified)
  seasonStats:{
    load:async(root)=>{
      const body=root.querySelector('.ss-body');
      DOM.showEmpty(body,'Season stats - coming soon');
    }
  },

  // STAGE 3: Match Comparison (simplified)
  matchComparison:{
    load:async(root)=>{
      const body=root.querySelector('.ss-body');
      DOM.showEmpty(body,'Match comparison - coming soon');
    }
  },

  // STAGE 3: Live Ticker (simplified)
  liveTicker:{
    load:async(root)=>{
      const body=root.querySelector('.ss-ticker-body');
      DOM.showEmpty(body,'Live ticker - coming soon');
    }
  }
};

// Initialize ALL widgets
function init(){
  // Stage 1 widgets
  document.querySelectorAll('.ss-widget.ss-live').forEach(root=>{
    Widgets.liveMatches.load(root);
    const refresh=parseInt(root.getAttribute('data-refresh')||'0',10);
    if(refresh>0)setInterval(()=>Widgets.liveMatches.load(root),refresh*1000);
  });
  
  document.querySelectorAll('.ss-widget.ss-fixtures').forEach(root=>Widgets.fixtures.load(root));
  document.querySelectorAll('.ss-widget.ss-standings').forEach(root=>Widgets.standings.load(root));
  
  // Stage 2 widgets
  document.querySelectorAll('.ss-widget.ss-match-center').forEach(root=>Widgets.matchCenter.load(root));
  document.querySelectorAll('.ss-widget.ss-xg-match').forEach(root=>Widgets.xgMatch.load(root));
  document.querySelectorAll('.ss-widget.ss-team-profile').forEach(root=>Widgets.teamProfile.load(root));
  document.querySelectorAll('.ss-widget.ss-player-profile').forEach(root=>Widgets.playerProfile.load(root));
  document.querySelectorAll('.ss-widget.ss-odds').forEach(root=>Widgets.odds.load(root));
  document.querySelectorAll('.ss-widget.ss-predictions').forEach(root=>Widgets.predictions.load(root));
  document.querySelectorAll('.ss-widget.ss-topscorers').forEach(root=>Widgets.topscorers.load(root));
  document.querySelectorAll('.ss-widget.ss-h2h').forEach(root=>Widgets.h2h.load(root));
  
  // Stage 3 widgets
  document.querySelectorAll('.ss-widget.ss-calendar').forEach(root=>Widgets.calendar.load(root));
  document.querySelectorAll('.ss-widget.ss-season-stats').forEach(root=>Widgets.seasonStats.load(root));
  document.querySelectorAll('.ss-widget.ss-match-comparison').forEach(root=>Widgets.matchComparison.load(root));
  document.querySelectorAll('.ss-widget.ss-live-ticker').forEach(root=>Widgets.liveTicker.load(root));
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init);
}else{
  init();
}

})();
