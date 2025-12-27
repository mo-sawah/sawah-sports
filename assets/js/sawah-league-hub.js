(function ($) {
  "use strict";

  // We use the REST URL for Standings/Players, but AJAX for Rounds
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

  function fmtTime(ts) {
    if (!ts) return "-";
    const d = new Date(ts * 1000);
    return (
      d.getHours().toString().padStart(2, "0") +
      ":" +
      d.getMinutes().toString().padStart(2, "0")
    );
  }

  function getScore(fx) {
    if (!fx.scores || !fx.scores.length) return { home: "-", away: "-" };

    // Try 'CURRENT', then '2ND_HALF', then 'FT'
    let s = fx.scores.find((x) => x.description === "CURRENT");
    if (!s) s = fx.scores.find((x) => x.description === "2ND_HALF");
    if (!s) s = fx.scores.find((x) => x.description === "FT");
    if (!s) s = fx.scores[fx.scores.length - 1];

    // Robust check for different API structures
    let h = "-",
      a = "-";
    if (s && s.score && s.score.goals) {
      h = s.score.goals.home ?? 0;
      a = s.score.goals.away ?? 0;
    }
    return { home: h, away: a };
  }

  // --- Rendering Functions ---

  function renderMatches($root, fixtures) {
    const $list = $root.find(".ss-lh-matches-list");
    if (!fixtures || !fixtures.length) {
      $list.html(
        '<div style="padding:20px;text-align:center;color:#999">No matches in this round.</div>'
      );
      return;
    }

    // Sort by time
    fixtures.sort(
      (a, b) => (a.starting_at.timestamp || 0) - (b.starting_at.timestamp || 0)
    );

    const html = fixtures
      .map((fx) => {
        const home =
          fx.participants.find((p) => p.meta.location === "home") || {};
        const away =
          fx.participants.find((p) => p.meta.location === "away") || {};
        const sc = getScore(fx);

        const state = fx.state ? fx.state.short_name : "NS";
        const time = state === "NS" ? fmtTime(fx.starting_at.timestamp) : state;
        const isLive = ["LIVE", "HT", "ET", "PEN_LIVE"].includes(state);

        return `
            <div class="ss-lh-match">
                <div class="ss-lh-match-time ${
                  isLive ? "live" : ""
                }">${time}</div>
                <div class="ss-lh-match-teams">
                    <div class="ss-lh-m-team">
                        <span><img src="${
                          home.image_path || ""
                        }" onerror="this.style.display='none'"> ${esc(
          home.name
        )}</span>
                        <span class="ss-lh-m-score ${isLive ? "live" : ""}">${
          sc.home
        }</span>
                    </div>
                    <div class="ss-lh-m-team">
                        <span><img src="${
                          away.image_path || ""
                        }" onerror="this.style.display='none'"> ${esc(
          away.name
        )}</span>
                        <span class="ss-lh-m-score ${isLive ? "live" : ""}">${
          sc.away
        }</span>
                    </div>
                </div>
            </div>`;
      })
      .join("");
    $list.html(html);
  }

  function renderFeatured($root, fixtures) {
    const $box = $root.find(".ss-lh-featured-body");

    // Logic: 1. Live, 2. NS (Upcoming/closest), 3. FT (Recently finished)
    let feat = fixtures.find((f) =>
      ["LIVE", "HT", "ET"].includes(f.state?.short_name)
    );
    if (!feat) feat = fixtures.find((f) => f.state?.short_name === "NS");
    if (!feat) feat = fixtures[fixtures.length - 1]; // Last played if all finished

    if (!feat) {
      $box.html(
        '<div style="padding:15px;text-align:center;color:#999">No matches available</div>'
      );
      return;
    }

    const home =
      feat.participants.find((p) => p.meta.location === "home") || {};
    const away =
      feat.participants.find((p) => p.meta.location === "away") || {};
    const sc = getScore(feat);
    const state = feat.state ? feat.state.short_name : "NS";
    const statusLabel =
      state === "NS" ? fmtTime(feat.starting_at.timestamp) : state;
    const isLive = ["LIVE", "HT"].includes(state);

    $box.html(`
        <div class="ss-lh-featured-row">
            <div class="ss-feat-meta ${
              isLive ? "live" : ""
            }">${statusLabel}</div>
            <div class="ss-feat-row">
                <div class="ss-feat-team">
                    <img src="${home.image_path || ""}">
                    <div class="ss-feat-team-name">${esc(home.name)}</div>
                </div>
                <div class="ss-feat-score">
                    ${state === "NS" ? "VS" : `${sc.home} - ${sc.away}`}
                </div>
                <div class="ss-feat-team">
                    <img src="${away.image_path || ""}">
                    <div class="ss-feat-team-name">${esc(away.name)}</div>
                </div>
            </div>
        </div>
      `);
  }

  function renderStandings($root, rows, scope) {
    const $box = $root.find(".ss-lh-standings-body");
    if (!rows || !rows.length) {
      $box.html(
        '<div style="padding:20px;text-align:center">No standings data.</div>'
      );
      return;
    }

    const html = rows
      .map((r) => {
        const team = r.participant || r.team;
        let stats = r;
        // Filter stats if scope is home/away
        if (scope !== "all" && r[scope]) stats = r[scope];

        // Color Badges
        let rankCls = "";
        if (r.position <= 4) rankCls = "ss-rank-1";
        else if (rows.length - r.position < 3) rankCls = "ss-rank-rel";

        // Form Badges (Only show on 'all')
        const formHtml =
          scope === "all" && r.form
            ? `<div class="ss-form-badges">
                  ${r.form
                    .split("")
                    .slice(0, 5)
                    .map(
                      (c) =>
                        `<span class="ss-badge ss-b-${c.toUpperCase()}">${c}</span>`
                    )
                    .join("")}
               </div>`
            : "";

        return `
            <tr>
                <td><span class="ss-rank-box ${rankCls}">${
          r.position
        }</span></td>
                <td class="tl">
                    <div style="display:flex;align-items:center;gap:6px">
                        <img src="${
                          team.image_path
                        }" style="width:20px;height:20px">
                        <span>${esc(team.name)}</span>
                    </div>
                </td>
                <td>${stats.played || stats.games_played || 0}</td>
                <td>${stats.won || 0}</td>
                <td>${stats.draw || 0}</td>
                <td>${stats.lost || 0}</td>
                <td style="font-weight:700">${stats.points || 0}</td>
                ${
                  scope === "all" ? `<td class="hide-mob">${formHtml}</td>` : ""
                }
            </tr>
          `;
      })
      .join("");

    $box.html(`
        <table class="ss-standings-table">
            <thead>
                <tr>
                    <th width="30">#</th> <th class="tl">Team</th> <th width="30">P</th>
                    <th width="30">W</th> <th width="30">D</th> <th width="30">L</th>
                    <th width="30">Pts</th> ${
                      scope === "all"
                        ? '<th width="100" class="hide-mob">Form</th>'
                        : ""
                    }
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
      `);
  }

  function renderTopPlayers($root, list) {
    const $box = $root.find(".ss-lh-topplayers-body");
    if (!list || !list.length) {
      $box.html(
        '<div style="padding:15px;color:#999;text-align:center">No data</div>'
      );
      return;
    }

    const html = list
      .slice(0, 5)
      .map((p, i) => {
        const player = p.player;
        const team = p.participant || p.team;
        return `
            <div class="ss-lh-player-row">
                <div class="ss-lh-p-rank">${i + 1}</div>
                <img src="${player.image_path || ""}" class="ss-lh-p-img">
                <div class="ss-lh-p-info">
                    <div class="ss-lh-p-name">${esc(player.name)}</div>
                    <div class="ss-lh-p-team">${esc(team.name)}</div>
                </div>
                <div class="ss-lh-p-val">${p.goals || p.total}</div>
            </div>
          `;
      })
      .join("");
    $box.html(html);
  }

  // --- Logic ---

  async function loadRoundsAndFixtures($root) {
    const seasonId = $root.data("season-id");
    const ajaxUrl = $root.data("ajax-url");
    const nonce = $root.data("nonce");

    // Call the Widget's Custom AJAX
    const url = `${ajaxUrl}?action=ss_hub_data&req_type=rounds&req_id=${seasonId}&nonce=${nonce}`;

    try {
      const res = await fetch(url).then((r) => r.json());
      if (!res.success) return;

      const rounds = res.data;
      if (!rounds || !rounds.length) return;

      $root.data("rounds", rounds);

      // Find current round
      let current =
        rounds.find((r) => r.is_current) || rounds[rounds.length - 1];
      $root.data("current-round-idx", rounds.indexOf(current));

      loadRound($root);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadRound($root) {
    const rounds = $root.data("rounds");
    const idx = $root.data("current-round-idx");
    const round = rounds[idx];
    if (!round) return;

    const ajaxUrl = $root.data("ajax-url");
    const nonce = $root.data("nonce");

    // Update UI
    $root.find(".ss-current-round").text(round.name);
    $root.find(".ss-lh-matches-list").html('<div class="ss-loading-sm"></div>');
    $root
      .find(".ss-lh-featured-body")
      .html('<div class="ss-loading-sm"></div>');

    // AJAX Fetch Fixtures
    const url = `${ajaxUrl}?action=ss_hub_data&req_type=fixtures&req_id=${round.id}&nonce=${nonce}`;
    const res = await fetch(url).then((r) => r.json());

    const fixtures = res.success && Array.isArray(res.data) ? res.data : [];

    renderMatches($root, fixtures);
    renderFeatured($root, fixtures);
  }

  async function loadStandingsAndPlayers($root) {
    const seasonId = $root.data("season-id");

    // We use existing REST endpoints for these since they work fine
    const [stdRes, plyRes] = await Promise.all([
      fetch(`${REST}/standings/${seasonId}`).then((r) => r.json()),
      fetch(`${REST}/topscorers/${seasonId}`).then((r) => r.json()),
    ]);

    // Standings
    let rows = [];
    if (stdRes.data)
      rows = Array.isArray(stdRes.data)
        ? stdRes.data
        : stdRes.data[0]?.standings || [];
    $root.data("raw-standings", rows);
    renderStandings($root, rows, "all");

    // Players
    let players = [];
    if (plyRes.data) players = Array.isArray(plyRes.data) ? plyRes.data : [];
    renderTopPlayers($root, players);
  }

  function init($root) {
    if (!$root.data("season-id")) return;

    // Initial Loads
    loadRoundsAndFixtures($root);
    loadStandingsAndPlayers($root);

    // Events
    $root.on("click", ".ss-round-nav", function () {
      const rounds = $root.data("rounds");
      if (!rounds) return;
      let idx = $root.data("current-round-idx");

      if ($(this).hasClass("prev")) idx = Math.max(0, idx - 1);
      else idx = Math.min(rounds.length - 1, idx + 1);

      $root.data("current-round-idx", idx);
      loadRound($root);
    });

    $root.on("click", ".ss-sub-pill", function () {
      $root.find(".ss-sub-pill").removeClass("active");
      $(this).addClass("active");
      renderStandings(
        $root,
        $root.data("raw-standings"),
        $(this).data("scope")
      );
    });
  }

  $(function () {
    $(".ss-sofa-hub").each(function () {
      init($(this));
    });
  });
})(jQuery);
