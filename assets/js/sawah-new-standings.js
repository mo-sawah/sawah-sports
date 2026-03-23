(function ($) {
  "use strict";

  const RULE_COLORS = [
    "#22c55e",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
    "#f43f5e",
  ];

  function getStat(details, typePrefix, statKey1, statKey2) {
    if (!details || !Array.isArray(details)) return 0;
    let keysToTry = [`${typePrefix}-${statKey1}`, `${typePrefix}_${statKey1}`];
    if (statKey2) {
      keysToTry.push(`${typePrefix}-${statKey2}`, `${typePrefix}_${statKey2}`);
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
    // Grab translations from the wrapper data attribute
    let i18n = $wrapper.data("i18n") || {};
    let t = {
      pos: i18n.pos || "Pos",
      team: i18n.team || "Team",
      p: i18n.p || "P",
      w: i18n.w || "W",
      d: i18n.d || "D",
      l: i18n.l || "L",
      f: i18n.f || "F",
      a: i18n.a || "A",
      gd: i18n.gd || "+/-",
      pts: i18n.pts || "PTS",
      form: i18n.form || "Form",
      key: i18n.key || "Key:",
    };

    let rulesMap = {};
    let colorIndex = 0;
    let teamsMap = {};

    for (let i = 0; i < data.length; i++) {
      let rawRow = data[i];
      if (!rawRow.participant_id) continue;
      let teamId = rawRow.participant_id;
      let played = getStat(
        rawRow.details,
        "overall",
        "matches-played",
        "matches_played",
      );

      let currentFormStr = "";
      if (typeof rawRow.form === "string") {
        currentFormStr = rawRow.form.replace(/[^WDL]/gi, "");
      } else if (Array.isArray(rawRow.form)) {
        currentFormStr = rawRow.form
          .map((f) => {
            if (typeof f === "string") return f;
            if (f && f.form) return f.form;
            if (f && f.result) return f.result;
            return "";
          })
          .join("")
          .replace(/[^WDL]/gi, "");
      }

      if (!teamsMap[teamId]) {
        teamsMap[teamId] = $.extend(true, {}, rawRow);
        teamsMap[teamId]._parsed_form = currentFormStr;
        teamsMap[teamId]._played = played;
        teamsMap[teamId]._rule = rawRow.rule; // Save rule safely
      } else {
        let existingPlayed = teamsMap[teamId]._played;
        let existingForm = teamsMap[teamId]._parsed_form;

        if (played > existingPlayed) {
          teamsMap[teamId] = $.extend(true, {}, rawRow);
          teamsMap[teamId]._parsed_form = existingForm + currentFormStr;
          teamsMap[teamId]._played = played;
          if (rawRow.rule) teamsMap[teamId]._rule = rawRow.rule;
        } else if (played < existingPlayed) {
          teamsMap[teamId]._parsed_form = currentFormStr + existingForm;
          if (rawRow.rule && !teamsMap[teamId]._rule)
            teamsMap[teamId]._rule = rawRow.rule;
        }
      }
    }

    let unified = Object.values(teamsMap);

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
    html += `<th class="ss-ns-pos">${t.pos}</th>`;
    html += `<th class="ss-ns-team-th">${t.team}</th>`;
    html += `<th>${t.p}</th><th>${t.w}</th><th>${t.d}</th><th>${t.l}</th>`;
    html += `<th class="ss-ns-hide-mobile">${t.f}</th><th class="ss-ns-hide-mobile">${t.a}</th>`;
    html += `<th>${t.gd}</th><th>${t.pts}</th>`;
    html += `<th class="ss-ns-form-th">${t.form}</th>`;
    html += "</tr></thead><tbody>";

    for (let i = 0; i < limit && i < unified.length; i++) {
      let row = unified[i];
      let team = row.participant || {};
      let details = row.details;

      let rule = row._rule || row.rule || null;
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

      html += `<tr>`;
      html += `<td class="ss-ns-pos" style="border-left: 4px solid ${ruleColor}">${i + 1}</td>`;
      html += `<td class="ss-ns-team"><img src="${team.image_path || ""}" class="ss-ns-logo" loading="lazy"> <span class="ss-ns-team-name">${team.name || "Unknown"}</span></td>`;

      html += `<td>${p}</td><td>${w}</td><td>${d}</td><td>${l}</td>`;
      html += `<td class="ss-ns-hide-mobile">${f}</td><td class="ss-ns-hide-mobile">${a}</td>`;
      html += `<td>${gd}</td><td class="ss-ns-pts">${pts}</td>`;

      let formStr = row._parsed_form || "";
      let formChars = formStr.slice(-5).split("");

      html += `<td class="ss-ns-form-td"><div class="ss-ns-form">`;
      for (let fIdx = 0; fIdx < 5; fIdx++) {
        let res = formChars[fIdx] ? formChars[fIdx].toUpperCase() : "";
        if (["W", "D", "L"].includes(res)) {
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
      // FIX: Only show legend if rules actually exist
      if (Object.keys(rulesMap).length > 0) {
        let legendHtml = `<div class="ss-ns-legend-title">${t.key}</div>`;
        for (const [rName, rColor] of Object.entries(rulesMap)) {
          legendHtml += `<div class="ss-ns-legend-item"><div class="ss-ns-legend-color" style="background:${rColor}"></div> <span class="ss-ns-legend-text">${rName}</span></div>`;
        }
        $wrapper.find(".ss-ns-legend").html(legendHtml).show();
      } else {
        $wrapper.find(".ss-ns-legend").hide();
      }
    }
  }

  function init($widget) {
    let $wrapper = $widget.find(".ss-new-standing-wrapper");
    let seasonId = $wrapper.data("season-id");
    let isLimit10 = $wrapper.hasClass("ss-limit-10");
    let i18n = $wrapper.data("i18n") || {};

    if (!seasonId) return;

    $wrapper.find(".ss-ns-content").hide();
    $wrapper.find(".ss-ns-loading").show();

    $.ajax({
      url: SawahSports.restUrl + "/new-standings/" + seasonId,
      method: "GET",
      success: function (data) {
        if (!data || data.length === 0) {
          $wrapper
            .find(".ss-ns-loading")
            .html(i18n.no_data || "No standing data available.");
          return;
        }
        $wrapper.data("raw-standings", data);
        renderTable($wrapper, data, "overall", isLimit10);
      },
      error: function () {
        $wrapper
          .find(".ss-ns-loading")
          .html(i18n.error || "Failed to load standings.");
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
