(function ($) {
  "use strict";

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

    let s = fx.scores.find((x) => x.description === "CURRENT");
    if (!s) s = fx.scores.find((x) => x.description === "2ND_HALF");
    if (!s) s = fx.scores.find((x) => x.description === "FT");
    if (!s) s = fx.scores[fx.scores.length - 1];

    let h = "-",
      a = "-";
    if (s && s.score && s.score.goals) {
      h = s.score.goals.home ?? 0;
      a = s.score.goals.away ?? 0;
    }
    return { home: h, away: a };
  }

  // --- Renderers ---
  function renderMatches($root, fixtures) {
    const $list = $root.find(".ss-lh-matches-list");
    if (!fixtures || !fixtures.length) {
      $list.html(
        '<div style="padding:20px;text-align:center;color:#999">No matches in this round.</div>'
      );
      return;
    }
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

    let feat = fixtures.find((f) =>
      ["LIVE", "HT", "ET"].includes(f.state?.short_name)
    );
    if (!feat) feat = fixtures.find((f) => f.state?.short_name === "NS");
    if (!feat) feat = fixtures[fixtures.length - 1];

    if (!feat) {
      $box.html(
        '<div style="padding:15px;text-align:center;color:#999">No featured match</div>'
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
        if (scope !== "all" && r[scope]) stats = r[scope];

        let rankCls = "";
        if (r.position <= 4) rankCls = "ss-rank-1";
        else if (rows.length - r.position < 3) rankCls = "ss-rank-rel";

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
                          team.image_path || ""
                        }" style="width:20px;height:20px;object-fit:contain;">
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
        '<div style="padding:15px;color:#999;text-align:center">No players data.</div>'
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

  // --- AJAX Fetchers ---

  async function loadRoundsAndFixtures($root) {
    const seasonId = $root.data("season-id");
    const ajaxUrl = $root.data("ajax-url");
    const nonce = $root.data("nonce");

    // 1. Get Rounds
    try {
      const res = await fetch(
        `${ajaxUrl}?action=ss_hub_data&req_type=rounds&req_id=${seasonId}&nonce=${nonce}`
      ).then((r) => r.json());

      if (!res.success || !res.data || !res.data.length) {
        $root
          .find(".ss-lh-matches-list")
          .html(
            '<div style="padding:20px;text-align:center">No rounds found</div>'
          );
        return;
      }

      const rounds = res.data;
      $root.data("rounds", rounds);

      // Current Round Logic
      let current =
        rounds.find((r) => r.is_current) || rounds[rounds.length - 1];
      $root.data("current-round-idx", rounds.indexOf(current));

      loadRound($root);
    } catch (e) {
      console.error("Rounds Error:", e);
    }
  }

  async function loadRound($root) {
    const rounds = $root.data("rounds");
    const idx = $root.data("current-round-idx");
    const round = rounds[idx];
    if (!round) return;

    const ajaxUrl = $root.data("ajax-url");
    const nonce = $root.data("nonce");

    $root.find(".ss-current-round").text(round.name);
    $root.find(".ss-lh-matches-list").html('<div class="ss-loading-sm"></div>');
    $root
      .find(".ss-lh-featured-body")
      .html('<div class="ss-loading-sm"></div>');

    try {
      const res = await fetch(
        `${ajaxUrl}?action=ss_hub_data&req_type=fixtures&req_id=${round.id}&nonce=${nonce}`
      ).then((r) => r.json());
      const fixtures = res.success && Array.isArray(res.data) ? res.data : [];
      renderMatches($root, fixtures);
      renderFeatured($root, fixtures);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadStandingsAndPlayers($root) {
    const seasonId = $root.data("season-id");
    const ajaxUrl = $root.data("ajax-url");
    const nonce = $root.data("nonce");

    // Fetch Standings
    try {
      const sRes = await fetch(
        `${ajaxUrl}?action=ss_hub_data&req_type=standings&req_id=${seasonId}&nonce=${nonce}`
      ).then((r) => r.json());
      let rows = [];
      if (sRes.success && sRes.data) {
        rows = Array.isArray(sRes.data)
          ? sRes.data
          : sRes.data[0]?.standings || [];
      }
      $root.data("raw-standings", rows);
      renderStandings($root, rows, "all");
    } catch (e) {
      console.error(e);
    }

    // Fetch Players
    try {
      const pRes = await fetch(
        `${ajaxUrl}?action=ss_hub_data&req_type=players&req_id=${seasonId}&nonce=${nonce}`
      ).then((r) => r.json());
      let players = pRes.success && Array.isArray(pRes.data) ? pRes.data : [];
      renderTopPlayers($root, players);
    } catch (e) {
      console.error(e);
    }
  }

  function init($root) {
    const sid = $root.data("season-id");
    if (!sid || sid == 0) {
      console.warn("Sawah Hub: No Season ID set in widget settings.");
      return;
    }

    loadRoundsAndFixtures($root);
    loadStandingsAndPlayers($root);

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
