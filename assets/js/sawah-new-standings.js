(function ($) {
  "use strict";

  // Colors matching your screenshot style
  const RULE_COLORS = [
    "#22c55e",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
    "#f43f5e",
  ];

  // Extracts the specific stat from Sportmonks' complex v3 array
  function getStat(details, typePrefix, statKey1, statKey2) {
    if (!details || !Array.isArray(details)) return 0;
    let keysToTry = [`${typePrefix}-${statKey1}`, `${typePrefix}_${statKey1}`];
    if (statKey2) {
      keysToTry.push(`${typePrefix}-${statKey2}`);
      keysToTry.push(`${typePrefix}_${statKey2}`);
    }

    for (let i = 0; i < details.length; i++) {
      let code =
        details[i].type && details[i].type.code
          ? details[i].type.code.toLowerCase()
          : "";
      if (keysToTry.includes(code)) return details[i].value;
    }
    return 0;
  }

  function renderTable($wrapper, data, typeFilter, isLimit10) {
    let rulesMap = {};
    let colorIndex = 0;

    // 1. Deduplicate teams and find the latest stats (fixes the multiple stages issue)
    let teamsMap = {};
    for (let i = 0; i < data.length; i++) {
      let row = data[i];
      if (!row.participant_id) continue;
      let teamId = row.participant_id;

      let played = getStat(
        row.details,
        "overall",
        "matches-played",
        "matches_played",
      );

      if (!teamsMap[teamId]) {
        teamsMap[teamId] = row;
      } else {
        let existingPlayed = getStat(
          teamsMap[teamId].details,
          "overall",
          "matches-played",
          "matches_played",
        );
        if (played > existingPlayed) {
          teamsMap[teamId] = row;
        }
      }
    }

    let unified = Object.values(teamsMap);

    // 2. Sort Unified array by Points DESC, then Goal Difference DESC
    unified.sort((a, b) => {
      let ptsA = a.points || 0;
      let ptsB = b.points || 0;
      if (ptsB !== ptsA) return ptsB - ptsA;

      let gdA = getStat(
        a.details,
        "overall",
        "goal-difference",
        "goal_difference",
      );
      let gdB = getStat(
        b.details,
        "overall",
        "goal-difference",
        "goal_difference",
      );
      return gdB - gdA;
    });

    let limit = isLimit10 ? 10 : unified.length;

    let html = '<table class="ss-ns-table"><thead><tr>';
    html += '<th class="ss-ns-pos">Pos</th>';
    html += '<th class="ss-ns-team-th">Team</th>';
    html += "<th>P</th><th>W</th><th>D</th><th>L</th>";
    html +=
      '<th class="ss-ns-hide-mobile">F</th><th class="ss-ns-hide-mobile">A</th>';
    html += "<th>+/-</th><th>PTS</th>";
    html += '<th class="ss-ns-form-th">Form</th>';
    html += "</tr></thead><tbody>";

    for (let i = 0; i < limit && i < unified.length; i++) {
      let row = unified[i];
      let team = row.participant || {};
      let details = row.details;

      let formStr = row.form || [];
      let rule = row.rule || null;
      let ruleColor = "transparent";

      if (rule && rule.name) {
        if (!rulesMap[rule.name]) {
          rulesMap[rule.name] = RULE_COLORS[colorIndex % RULE_COLORS.length];
          colorIndex++;
        }
        ruleColor = rulesMap[rule.name];
      }

      let p = getStat(details, typeFilter, "matches-played", "matches_played");
      let w = getStat(details, typeFilter, "won");
      let d = getStat(details, typeFilter, "draw");
      let l = getStat(details, typeFilter, "lost");
      let f = getStat(details, typeFilter, "goals-for", "goals_for");
      let a = getStat(details, typeFilter, "goals-against", "goals_against");
      let gd = getStat(
        details,
        typeFilter,
        "goal-difference",
        "goal_difference",
      );
      let pts =
        typeFilter === "overall"
          ? row.points || 0
          : getStat(details, typeFilter, "points");

      let position = i + 1;

      html += `<tr>`;
      html += `<td class="ss-ns-pos" style="border-left: 4px solid ${ruleColor}">${position}</td>`;
      html += `<td class="ss-ns-team"><img src="${team.image_path || ""}" class="ss-ns-logo" loading="lazy"> <span class="ss-ns-team-name">${team.name || "Unknown"}</span></td>`;

      html += `<td>${p}</td>`;
      html += `<td>${w}</td>`;
      html += `<td>${d}</td>`;
      html += `<td>${l}</td>`;
      html += `<td class="ss-ns-hide-mobile">${f}</td>`;
      html += `<td class="ss-ns-hide-mobile">${a}</td>`;
      html += `<td>${gd}</td>`;
      html += `<td class="ss-ns-pts">${pts}</td>`;

      html += `<td class="ss-ns-form-td"><div class="ss-ns-form">`;
      let formLimit = 5;
      for (let fIdx = 0; fIdx < formLimit; fIdx++) {
        if (formStr[fIdx] && formStr[fIdx].form) {
          let res = formStr[fIdx].form.toUpperCase();
          let badgeClass = res === "W" ? "ss-w" : res === "D" ? "ss-d" : "ss-l";
          html += `<span class="ss-ns-badge ${badgeClass}">${res}</span>`;
        } else {
          html += `<span class="ss-ns-badge ss-empty"></span>`;
        }
      }
      html += `</div></td></tr>`;
    }

    html += "</tbody></table>";

    $wrapper.find(".ss-ns-loading").hide();
    $wrapper.find(".ss-ns-content").html(html).show();

    if (!isLimit10) {
      let legendHtml = '<div class="ss-ns-legend-title">Key:</div>';
      for (const [rName, rColor] of Object.entries(rulesMap)) {
        legendHtml += `<div class="ss-ns-legend-item"><div class="ss-ns-legend-color" style="background:${rColor}"></div> <span class="ss-ns-legend-text">${rName}</span></div>`;
      }
      $wrapper.find(".ss-ns-legend").html(legendHtml);
    }
  }

  function init($widget) {
    let $wrapper = $widget.find(".ss-new-standing-wrapper");
    let seasonId = $wrapper.data("season-id");
    let isLimit10 = $wrapper.hasClass("ss-limit-10");

    if (!seasonId) return;

    $wrapper.find(".ss-ns-content").hide();
    $wrapper.find(".ss-ns-loading").show();

    $.ajax({
      url: SawahSports.restUrl + "/new-standings/" + seasonId,
      method: "GET",
      success: function (data) {
        if (!data || data.length === 0) {
          $wrapper.find(".ss-ns-loading").html("No standing data available.");
          return;
        }
        $wrapper.data("raw-standings", data);
        renderTable($wrapper, data, "overall", isLimit10);
      },
      error: function () {
        $wrapper.find(".ss-ns-loading").html("Failed to load standings.");
      },
    });

    $wrapper.on("click", ".ss-ns-tab", function () {
      $wrapper.find(".ss-ns-tab").removeClass("active");
      $(this).addClass("active");
      let type = $(this).data("type");
      let rawData = $wrapper.data("raw-standings");
      if (rawData) {
        renderTable($wrapper, rawData, type, isLimit10);
      }
    });
  }

  $(window).on("elementor/frontend/init", function () {
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/sawah_sports_new_standing_10.default",
      init,
    );
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/sawah_sports_new_standing_full.default",
      init,
    );
  });

  $(document).ready(function () {
    $(
      ".elementor-widget-sawah_sports_new_standing_10, .elementor-widget-sawah_sports_new_standing_full",
    ).each(function () {
      init($(this));
    });
  });
})(jQuery);
