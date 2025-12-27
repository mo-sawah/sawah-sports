(function ($) {
  "use strict";

  const I18N =
    window.SawahSports && window.SawahSports.i18n
      ? window.SawahSports.i18n
      : {};
  const REST =
    window.SawahSports && window.SawahSports.restUrl
      ? window.SawahSports.restUrl
      : "";

  function esc(s) {
    return String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  }

  // Format Time (18:00)
  function fmtTime(dStr) {
    if (!dStr) return "-";
    const d = new Date(dStr.replace(/-/g, "/")); // safari fix
    return (
      d.getHours().toString().padStart(2, "0") +
      ":" +
      d.getMinutes().toString().padStart(2, "0")
    );
  }

  // Parse Form string (WWDLL) into HTML
  function renderForm(formStr) {
    if (!formStr) return "";
    const chars = formStr.split("").slice(0, 5); // Max 5
    return (
      `<div class="ss-form-badges">` +
      chars
        .map((c) => {
          const u = c.toUpperCase();
          let cls = "ss-b-D"; // draw default
          if (u === "W") cls = "ss-b-W";
          if (u === "L") cls = "ss-b-L";
          return `<div class="ss-badge ${cls}">${u}</div>`;
        })
        .join("") +
      `</div>`
    );
  }

  function getTeam(fx, loc) {
    const parts = fx && fx.participants ? fx.participants : [];
    return parts.find((p) => p && p.meta && p.meta.location === loc) || null;
  }

  // Render Sidebar Matches
  function renderMatchesList($root, fixtures) {
    const $list = $root.find(".ss-lh-matches-list");
    if (!fixtures.length) {
      $list.html(
        '<div style="padding:15px;text-align:center;color:#999">No matches today</div>'
      );
      return;
    }

    const html = fixtures
      .map((fx) => {
        const home = getTeam(fx, "home");
        const away = getTeam(fx, "away");
        const hName = home?.name || home?.short_code || "-";
        const aName = away?.name || away?.short_code || "-";
        const hImg = home?.image_path || "";
        const aImg = away?.image_path || "";

        // Scores
        let hScore = "-",
          aScore = "-";
        const scores = fx.scores || [];
        const curr =
          scores.find((s) => s.description === "CURRENT") ||
          scores[scores.length - 1];
        if (curr && curr.score && curr.score.goals) {
          hScore = curr.score.goals.home || 0;
          aScore = curr.score.goals.away || 0;
        }

        const state = fx.state ? fx.state.short_name : "NS";
        const time = state === "NS" ? fmtTime(fx.starting_at.timestamp) : state;
        const isLive = ["LIVE", "HT", "ET"].includes(state);

        return `
            <div class="ss-lh-match">
                <div class="ss-lh-match-time">${time}</div>
                <div class="ss-lh-match-teams">
                    <div class="ss-lh-m-team">
                        <span>${
                          hImg ? `<img src="${hImg}">` : ""
                        } ${hName}</span>
                        <span class="ss-lh-m-score ${
                          isLive ? "live" : ""
                        }">${hScore}</span>
                    </div>
                    <div class="ss-lh-m-team">
                        <span>${
                          aImg ? `<img src="${aImg}">` : ""
                        } ${aName}</span>
                        <span class="ss-lh-m-score ${
                          isLive ? "live" : ""
                        }">${aScore}</span>
                    </div>
                </div>
            </div>
          `;
      })
      .join("");
    $list.html(html);
  }

  // Render Sidebar Featured
  function renderFeatured($root, fixtures) {
    const $box = $root.find(".ss-lh-featured-body");
    // Find a live match or the next upcoming one
    let featured = fixtures.find((f) =>
      ["LIVE", "HT"].includes(f.state?.short_name)
    );
    if (!featured) featured = fixtures[0]; // fallback to first

    if (!featured) {
      $box.html("");
      return;
    }

    const home = getTeam(featured, "home");
    const away = getTeam(featured, "away");
    const time = fmtTime(featured.starting_at.timestamp);

    $box.html(`
        <div class="ss-lh-featured-row">
            <div class="ss-feat-meta">${esc(
              featured.state?.state || "Upcoming"
            )} • ${time}</div>
            <div class="ss-feat-row">
                <div class="ss-feat-team">
                    <img src="${home?.image_path}" alt="">
                    <div class="ss-feat-team-name">${home?.name}</div>
                </div>
                <div class="ss-feat-score">VS</div>
                <div class="ss-feat-team">
                    <img src="${away?.image_path}" alt="">
                    <div class="ss-feat-team-name">${away?.name}</div>
                </div>
            </div>
        </div>
      `);
  }

  // Render Detailed Standings Table
  function renderStandings($root, rows, scope) {
    const $box = $root.find(".ss-lh-standings-body");
    if (!rows.length) {
      $box.html(
        `<div style="padding:20px;text-align:center">No standings data.</div>`
      );
      return;
    }

    const html = rows
      .map((r, i) => {
        // Determine rank class for color
        let rankCls = "";
        if (r.position <= 4) rankCls = "ss-rank-1";
        else if (r.position <= 6) rankCls = "ss-rank-5";
        else if (rows.length - r.position < 3) rankCls = "ss-rank-rel";

        const team = r.participant || r.team;
        const stats = scope === "all" ? r : r[scope] || r; // handle home/away scope

        // Form (usually only available on 'total' or 'all')
        const formHtml = scope === "all" && r.form ? renderForm(r.form) : "";

        return `
            <tr>
                <td><span class="ss-rank-box ${rankCls}">${
          r.position
        }</span></td>
                <td style="text-align:left; display:flex; align-items:center; gap:8px;">
                    <img src="${team.image_path}" style="width:20px;"> 
                    <span style="font-weight:600">${team.name}</span>
                </td>
                <td>${stats.played || 0}</td>
                <td>${stats.won || 0}</td>
                <td>${stats.draw || 0}</td>
                <td>${stats.lost || 0}</td>
                <td>${stats.goals_for || 0}:${stats.goals_against || 0}</td>
                <td style="font-weight:700">${stats.points || 0}</td>
                <td>${formHtml}</td>
            </tr>
          `;
      })
      .join("");

    $box.html(`
        <table class="ss-standings-table">
            <thead>
                <tr>
                    <th width="30">#</th>
                    <th class="tl">Team</th>
                    <th width="30">P</th>
                    <th width="30">W</th>
                    <th width="30">D</th>
                    <th width="30">L</th>
                    <th width="50">Goals</th>
                    <th width="30">Pts</th>
                    <th width="90">Last 5</th>
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
      `);
  }

  async function apiGet(path) {
    const url = REST ? `${REST}${path}` : path;
    const res = await fetch(url);
    return await res.json();
  }

  async function load($root) {
    const leagueId = $root.data("league-id");
    const seasonId = $root.data("season-id");
    const date = $root.data("current-date");

    // Parallel Fetch
    // 1. Fixtures for today (Sidebar)
    // 2. Standings (Main)

    const [fixRes, stdRes] = await Promise.all([
      apiGet(`/fixtures?date=${date}`),
      apiGet(`/standings/${seasonId}`),
    ]);

    // Filter league fixtures
    let fixtures = [];
    if (fixRes && fixRes.data) {
      fixtures = fixRes.data.filter(
        (f) => Number(f.league_id) === Number(leagueId)
      );
    }

    // Standings
    let standings = [];
    if (stdRes && stdRes.data) {
      // Handle groups vs simple standings
      standings = Array.isArray(stdRes.data)
        ? stdRes.data
        : stdRes.data.standings || [];
    }

    renderFeatured($root, fixtures);
    renderMatchesList($root, fixtures);
    renderStandings($root, standings, "all");

    // Cache raw standings for filtering
    $root.data("raw-standings", standings);
  }

  function init($root) {
    load($root);

    // Filter Standings (Home/Away/All)
    $root.on("click", ".ss-sub-pill", function () {
      const scope = $(this).data("scope");
      $root.find(".ss-sub-pill").removeClass("active");
      $(this).addClass("active");

      const raw = $root.data("raw-standings");
      if (raw) renderStandings($root, raw, scope);
    });

    // Main Tabs (Visual Only for now as we focused on Standings)
    $root.on("click", ".ss-main-tab", function () {
      $(".ss-main-tab").removeClass("active");
      $(this).addClass("active");
      // Logic to switch view to Stats/Details would go here
    });
  }

  $(function () {
    $(".ss-sofa-hub").each(function () {
      init($(this));
    });
  });
})(jQuery);
