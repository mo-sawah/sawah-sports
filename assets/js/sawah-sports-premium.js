/**
 * Sawah Sports Premium - Complete Premium Redesign
 * v4.0.0 - Sofascore-inspired Design
 */

(function(){"use strict";

// =====================================
// UTILITY MODULES
// =====================================

// Date utilities
const DateUtils = {
  format:(date)=>{
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const d = new Date(date);
    const isToday = d.toDateString() === today.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const isYesterday = d.toDateString() === yesterday.toDateString();
    
    if(isToday) return 'Today';
    if(isTomorrow) return 'Tomorrow';
    if(isYesterday) return 'Yesterday';
    
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  },
  
  toISO:(date)=>{
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },
  
  parse:(str)=>{
    return new Date(str);
  }
};

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
      else if(k.startsWith('on')&&typeof v==='function')n.addEventListener(k.slice(2).toLowerCase(),v);
      else n.setAttribute(k,v);
    });
    children.filter(Boolean).forEach(c=>n.appendChild(c));
    return n;
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
  },
  
  showLoading:(container)=>{
    DOM.clear(container);
    const loader = DOM.el('div',{class:'ss-loading'},[
      DOM.el('div',{class:'ss-spinner'}),
      DOM.el('div',{class:'ss-loading-text',text:'Loading...'})
    ]);
    container.appendChild(loader);
  }
};

// Image Module - Handles all image loading with fallbacks
const Image = {
  team:(team)=>{
    const url = team?.image_path || team?.logo_path || '';
    if(url) {
      return DOM.el('img',{
        class:'ss-team-logo',
        src:url,
        alt:team?.name||'',
        loading:'lazy',
        onerror:function(){
          this.style.display='none';
          const fallback = DOM.el('div',{
            class:'ss-team-logo-fallback',
            text:Image.initials(team?.name)
          });
          this.parentNode.insertBefore(fallback, this.nextSibling);
        }
      });
    }
    return DOM.el('div',{
      class:'ss-team-logo-fallback',
      text:Image.initials(team?.name)
    });
  },
  
  league:(league)=>{
    const url = league?.image_path || league?.logo_path || '';
    if(url) {
      return DOM.el('img',{
        class:'ss-league-logo',
        src:url,
        alt:league?.name||'',
        loading:'lazy',
        onerror:function(){this.style.display='none'}
      });
    }
    return null;
  },
  
  country:(country)=>{
    const url = country?.image_path || '';
    if(url) {
      return DOM.el('img',{
        class:'ss-country-flag',
        src:url,
        alt:country?.name||'',
        loading:'lazy'
      });
    }
    return null;
  },
  
  player:(player)=>{
    const url = player?.image_path || player?.photo_path || '';
    if(url) {
      return DOM.el('img',{
        class:'ss-player-photo',
        src:url,
        alt:player?.name||'',
        loading:'lazy',
        onerror:function(){
          this.style.display='none';
          const fallback = DOM.el('div',{
            class:'ss-player-photo-fallback',
            text:Image.initials(player?.name)
          });
          this.parentNode.insertBefore(fallback, this.nextSibling);
        }
      });
    }
    return DOM.el('div',{
      class:'ss-player-photo-fallback',
      text:Image.initials(player?.name)
    });
  },
  
  initials:(name)=>{
    const words=String(name||'').trim().split(/\s+/).filter(Boolean);
    if(!words.length)return '—';
    return(words[0][0]+(words.length>1?words[words.length-1][0]:'')).toUpperCase();
  }
};

// Team Module
const Team={
  fromParticipants:(participants,location)=>{
    if(!Array.isArray(participants))return null;
    return participants.find(x=>x?.meta?.location?.toLowerCase()===location)||
           participants[location==='home'?0:1]||null;
  },
  
  node:(team,align='left')=>{
    const name=team?.name||team?.short_code||'—';
    return DOM.el('div',{class:`ss-team ss-team-${align}`},[
      Image.team(team),
      DOM.el('span',{class:'ss-team-name',text:name})
    ]);
  }
};

// Match Module
const Match={
  score:(fx)=>{
    const scores=fx?.scores;
    if(!Array.isArray(scores))return{home:'—',away:'—'};
    const current=scores.find(s=>s?.description?.toLowerCase().includes('current'))||scores[scores.length-1];
    if(current?.score){
      return{
        home:current.score.home??current.score.home_score??'—',
        away:current.score.away??current.score.away_score??'—'
      };
    }
    return{home:'—',away:'—'};
  },
  
  state:(fx)=>{
    const st=fx?.state;
    return st?.short_name||st?.short||st?.name||'';
  },
  
  time:(fx)=>{
    const s=fx?.starting_at;
    if(!s)return'';
    const m=String(s).match(/(\d{2}):(\d{2})/);
    return m?`${m[1]}:${m[2]}`:'';
  },
  
  isLive:(fx)=>{
    const state=Match.state(fx).toUpperCase();
    return['LIVE','HT','ET','PEN_LIVE','AET','1ST_HALF','2ND_HALF'].includes(state);
  },
  
  isFinished:(fx)=>{
    const state=Match.state(fx).toUpperCase();
    return['FT','FT_PEN','AET'].includes(state);
  },
  
  status:(fx)=>{
    if(Match.isLive(fx))return'live';
    if(Match.isFinished(fx))return'finished';
    return'upcoming';
  }
};

// =====================================
// WIDGETS
// =====================================

const Widgets = {
  
  // TODAY'S MATCHES - Complete redesign with date navigation
  todaysMatches: {
    currentDate: new Date(),
    
    render:(root,fixtures)=>{
      const body=root.querySelector('.ss-body');
      
      if(!fixtures||fixtures.length===0){
        DOM.showEmpty(body,'No matches on this date');
        return;
      }
      
      // Group by competition
      const byLeague = {};
      fixtures.forEach(fx=>{
        const league=fx.league||{};
        const leagueId=league.id||'other';
        if(!byLeague[leagueId]){
          byLeague[leagueId]={
            league:league,
            matches:[]
          };
        }
        byLeague[leagueId].matches.push(fx);
      });
      
      // Sort each league's matches: Live > Upcoming > Finished
      Object.values(byLeague).forEach(group=>{
        group.matches.sort((a,b)=>{
          const statusOrder={live:0,upcoming:1,finished:2};
          const statusA=Match.status(a);
          const statusB=Match.status(b);
          if(statusOrder[statusA]!==statusOrder[statusB]){
            return statusOrder[statusA]-statusOrder[statusB];
          }
          return new Date(a.starting_at)-new Date(b.starting_at);
        });
      });
      
      const container=DOM.el('div',{class:'ss-matches-container'});
      
      // Render each league group
      Object.values(byLeague).forEach(group=>{
        const leagueSection=DOM.el('div',{class:'ss-league-group'},[
          DOM.el('div',{class:'ss-league-header'},[
            Image.league(group.league),
            DOM.el('span',{class:'ss-league-name',text:group.league.name||'Other'}),
            Image.country(group.league.country)
          ])
        ]);
        
        const matchesList=DOM.el('div',{class:'ss-matches-list'});
        
        group.matches.forEach(fx=>{
          const participants=fx.participants||[];
          const home=Team.fromParticipants(participants,'home');
          const away=Team.fromParticipants(participants,'away');
          const score=Match.score(fx);
          const status=Match.status(fx);
          const isLive=status==='live';
          const isFinished=status==='finished';
          
          const matchCard=DOM.el('div',{class:`ss-match-card ss-match-${status}`},[
            // Time/Status column
            DOM.el('div',{class:'ss-match-time'},[
              isLive?
                DOM.el('div',{class:'ss-live-badge'},[
                  DOM.el('span',{class:'ss-live-dot'}),
                  DOM.el('span',{text:'LIVE'})
                ]):
                isFinished?
                  DOM.el('div',{class:'ss-finished-badge',text:'FT'}):
                  DOM.el('div',{class:'ss-time-badge',text:Match.time(fx)})
            ]),
            
            // Teams and Score
            DOM.el('div',{class:'ss-match-teams'},[
              // Home team
              DOM.el('div',{class:'ss-team-row'},[
                Image.team(home),
                DOM.el('span',{class:'ss-team-name',text:home?.name||'TBD'})
              ]),
              // Away team
              DOM.el('div',{class:'ss-team-row'},[
                Image.team(away),
                DOM.el('span',{class:'ss-team-name',text:away?.name||'TBD'})
              ])
            ]),
            
            // Score
            DOM.el('div',{class:'ss-match-score'},[
              DOM.el('div',{class:'ss-score-number',text:score.home}),
              DOM.el('div',{class:'ss-score-separator',text:'-'}),
              DOM.el('div',{class:'ss-score-number',text:score.away})
            ])
          ]);
          
          matchesList.appendChild(matchCard);
        });
        
        leagueSection.appendChild(matchesList);
        container.appendChild(leagueSection);
      });
      
      DOM.clear(body);
      body.appendChild(container);
    },
    
    changeDate:(root,direction)=>{
      const instance=Widgets.todaysMatches;
      if(direction===0){
        instance.currentDate=new Date();
      }else{
        instance.currentDate.setDate(instance.currentDate.getDate()+direction);
      }
      instance.load(root);
    },
    
    load:async(root)=>{
      const header=root.querySelector('.ss-header');
      const body=root.querySelector('.ss-body');
      const instance=Widgets.todaysMatches;
      
      // Update header with date navigation
      if(header){
        DOM.clear(header);
        const nav=DOM.el('div',{class:'ss-date-nav'},[
          DOM.el('button',{
            class:'ss-nav-btn ss-nav-prev',
            text:'‹',
            onClick:()=>instance.changeDate(root,-1)
          }),
          DOM.el('div',{class:'ss-date-display'},[
            DOM.el('span',{text:DateUtils.format(instance.currentDate)}),
            DOM.el('button',{
              class:'ss-today-btn',
              text:'Today',
              onClick:()=>instance.changeDate(root,0)
            })
          ]),
          DOM.el('button',{
            class:'ss-nav-btn ss-nav-next',
            text:'›',
            onClick:()=>instance.changeDate(root,1)
          })
        ]);
        header.appendChild(nav);
      }
      
      DOM.showLoading(body);
      
      try{
        const date=DateUtils.toISO(instance.currentDate);
        const response=await API.get('/fixtures',{date:date});
        const fixtures=response?.data?.data||response?.data||[];
        instance.render(root,fixtures);
      }catch(error){
        console.error('Today Matches Error:',error);
        DOM.showError(body,'Unable to load matches');
      }
    }
  },
  
  // STANDINGS - Improved with team logos
  standings:{
    render:(root,standings)=>{
      const body=root.querySelector('.ss-body');
      
      if(!standings||standings.length===0){
        DOM.showEmpty(body,'No standings data');
        return;
      }
      
      const table=DOM.el('table',{class:'ss-standings-table'});
      
      // Header
      const thead=DOM.el('thead');
      const headerRow=DOM.el('tr');
      ['#','Team','P','W','D','L','GD','Pts'].forEach(h=>{
        headerRow.appendChild(DOM.el('th',{text:h}));
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Body
      const tbody=DOM.el('tbody');
      standings.forEach((s,i)=>{
        const team=s.participant||{};
        const row=DOM.el('tr',{class:i<4?'ss-top-four':''});
        
        // Position
        row.appendChild(DOM.el('td',{class:'ss-pos',text:s.position||i+1}));
        
        // Team with logo
        const teamCell=DOM.el('td',{class:'ss-team-cell'});
        const teamDiv=DOM.el('div',{class:'ss-team-info'},[
          Image.team(team),
          DOM.el('span',{class:'ss-team-name',text:team.name||'—'})
        ]);
        teamCell.appendChild(teamDiv);
        row.appendChild(teamCell);
        
        // Stats
        row.appendChild(DOM.el('td',{text:s.played||0}));
        row.appendChild(DOM.el('td',{text:s.won||0}));
        row.appendChild(DOM.el('td',{text:s.draw||0}));
        row.appendChild(DOM.el('td',{text:s.lost||0}));
        row.appendChild(DOM.el('td',{text:s.goal_difference||0}));
        row.appendChild(DOM.el('td',{class:'ss-points',text:s.points||0}));
        
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      
      DOM.clear(body);
      body.appendChild(table);
    },
    
    load:async(root)=>{
      const seasonId=root.getAttribute('data-season');
      const body=root.querySelector('.ss-body');
      
      if(!seasonId){
        DOM.showError(body,'Season ID required');
        return;
      }
      
      DOM.showLoading(body);
      
      try{
        const response=await API.get(`/standings/${seasonId}`);
        const standings=response?.data?.data||response?.data||[];
        Widgets.standings.render(root,standings);
      }catch(error){
        console.error('Standings Error:',error);
        DOM.showError(body,'Unable to load standings');
      }
    }
  },
  
  // FIXTURES - Similar to Today's Matches but for specific season
  fixtures:{
    load:async(root)=>{
      const seasonId=root.getAttribute('data-season');
      const body=root.querySelector('.ss-body');
      
      if(!seasonId){
        DOM.showError(body,'Season ID required');
        return;
      }
      
      DOM.showLoading(body);
      
      try{
        const response=await API.get('/fixtures',{season_id:seasonId});
        const fixtures=response?.data?.data||response?.data||[];
        // Reuse today's matches render function
        Widgets.todaysMatches.render(root,fixtures);
      }catch(error){
        console.error('Fixtures Error:',error);
        DOM.showError(body,'Unable to load fixtures');
      }
    }
  },
  
  // TEAM PROFILE - Improved with better layout
  teamProfile:{
    load:async(root)=>{
      const teamId=root.getAttribute('data-team');
      const body=root.querySelector('.ss-body');
      
      if(!teamId){
        DOM.showError(body,'Team ID required');
        return;
      }
      
      DOM.showLoading(body);
      
      try{
        const response=await API.get(`/team/${teamId}`);
        const team=response?.data?.data||response?.data;
        
        if(!team||!team.name){
          DOM.showEmpty(body,'Team not found');
          return;
        }
        
        const profile=DOM.el('div',{class:'ss-team-profile'},[
          DOM.el('div',{class:'ss-profile-header'},[
            Image.team(team),
            DOM.el('div',{class:'ss-profile-info'},[
              DOM.el('h2',{class:'ss-profile-name',text:team.name}),
              DOM.el('div',{class:'ss-profile-meta'},[
                Image.country(team.country),
                DOM.el('span',{text:team.country?.name||''}),
                team.founded?DOM.el('span',{text:'Founded: '+team.founded}):null
              ].filter(Boolean))
            ])
          ]),
          team.venue?DOM.el('div',{class:'ss-venue-info'},[
            DOM.el('strong',{text:'Venue: '}),
            DOM.el('span',{text:team.venue.name||''})
          ]):null
        ].filter(Boolean));
        
        DOM.clear(body);
        body.appendChild(profile);
      }catch(error){
        console.error('Team Profile Error:',error);
        DOM.showError(body,'Unable to load team');
      }
    }
  },
  
  // TOP SCORERS - Improved with player photos
  topscorers:{
    load:async(root)=>{
      const seasonId=root.getAttribute('data-season');
      const type=root.getAttribute('data-type')||'goals';
      const body=root.querySelector('.ss-body');
      
      if(!seasonId){
        DOM.showError(body,'Season ID required');
        return;
      }
      
      DOM.showLoading(body);
      
      try{
        const response=await API.get(`/topscorers/${seasonId}`,{type});
        const scorers=response?.data?.data||response?.data||[];
        
        if(!Array.isArray(scorers)||scorers.length===0){
          DOM.showEmpty(body,'No data available');
          return;
        }
        
        const list=DOM.el('div',{class:'ss-topscorers-list'});
        
        scorers.slice(0,10).forEach((s,i)=>{
          const player=s.player||{};
          const team=s.participant||{};
          
          const row=DOM.el('div',{class:'ss-scorer-card'},[
            DOM.el('div',{class:'ss-rank',text:i+1}),
            DOM.el('div',{class:'ss-player-info'},[
              Image.player(player),
              DOM.el('div',{class:'ss-player-details'},[
                DOM.el('div',{class:'ss-player-name',text:player.name||''}),
                DOM.el('div',{class:'ss-team-name'},[
                  Image.team(team),
                  DOM.el('span',{text:team.name||''})
                ])
              ])
            ]),
            DOM.el('div',{class:'ss-stat-value',text:s.total||0})
          ]);
          
          list.appendChild(row);
        });
        
        DOM.clear(body);
        body.appendChild(list);
      }catch(error){
        console.error('Top Scorers Error:',error);
        DOM.showError(body,'Unable to load data');
      }
    }
  }
  
  // Other widgets will be added similarly...
};

// =====================================
// INITIALIZATION
// =====================================

function init(){
  // Today's Matches
  document.querySelectorAll('.ss-widget.ss-todays-matches').forEach(root=>{
    Widgets.todaysMatches.load(root);
  });
  
  // Standings
  document.querySelectorAll('.ss-widget.ss-standings').forEach(root=>{
    Widgets.standings.load(root);
  });
  
  // Fixtures
  document.querySelectorAll('.ss-widget.ss-fixtures').forEach(root=>{
    Widgets.fixtures.load(root);
  });
  
  // Team Profile
  document.querySelectorAll('.ss-widget.ss-team-profile').forEach(root=>{
    Widgets.teamProfile.load(root);
  });
  
  // Top Scorers
  document.querySelectorAll('.ss-widget.ss-topscorers').forEach(root=>{
    Widgets.topscorers.load(root);
  });
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init);
}else{
  init();
}

})();
