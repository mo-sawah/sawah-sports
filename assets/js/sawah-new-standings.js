(function ($) {
  "use strict";

  // Palette for qualification rules (Top to Bottom)
  const RULE_COLORS = [
    "#4ade80",
    "#86efac",
    "#60a5fa",
    "#fde047",
    "#fca5a5",
    "#ef4444",
    "#991b1b",
  ];

  function getDetailsByType(detailsArr, targetType) {
    if (!detailsArr) return null;
    for (let i = 0; i < detailsArr.length; i++) {
      let typeName =
        detailsArr[i].type && detailsArr[i].type.name
          ? detailsArr[i].type.name.toLowerCase()
          : "";
      let code =
        detailsArr[i].type && detailsArr[i].type.code
          ? detailsArr[i].type.code.toLowerCase()
          : "";
      if (typeName === targetType || code === targetType) return detailsArr[i];
    }
    return detailsArr[0]; // fallback
  }

  function renderTable($wrapper, data, typeFilter, isLimit10) {
    let rulesMap = {};
    let colorIndex = 0;

    // Ensure we're targeting the first active standing stage if nested
    let standingsArr = data;
    if (data.length > 0 && data[0].standings) {
      standingsArr = data[0].standings;
    }

    let limit = isLimit10 ? 10 : standingsArr.length;

    let html = '<table class="ss-ns-table"><thead><tr>';
    html += '<th class="ss-ns-pos">Pos</th>';
    html += "<th>Team</th>";
    html += "<th>P</th><th>W</th><th>D</th><th>L</th>";
    html +=
      '<th class="ss-ns-hide-mobile">F</th><th class="ss-ns-hide-mobile">A</th>';
    html += "<th>+/-</th><th>PTS</th>";
    html += '<th class="ss-ns-hide-mobile">Form</th>';
    html += "</tr></thead><tbody>";

    for (let i = 0; i < limit && i < standingsArr.length; i++) {
      let row = standingsArr[i];
      let team = row.participant || {};
      let details = getDetailsByType(row.details, typeFilter);
      if (!details) continue;

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

      html += `<tr>`;
      html += `<td class="ss-ns-pos" style="border-left: 4px solid ${ruleColor}">${row.position || i + 1}</td>`;
      html += `<td class="ss-ns-team"><img src="${team.image_path || ""}" class="ss-ns-logo"> <span>${team.name || "Unknown"}</span></td>`;

      // Stats
      html += `<td>${details.value || 0}</td>`;
      let w = 0,
        d = 0,
        l = 0,
        f = 0,
        a = 0,
        gd = 0,
        pts = 0;

      // Sportmonks formats stats inside value/goals objects, extract carefully
      html += `<td>${details.won || 0}</td>`;
      html += `<td>${details.draw || 0}</td>`;
      html += `<td>${details.lost || 0}</td>`;

      let goals = details.goals || {};
      html += `<td class="ss-ns-hide-mobile">${goals.for || 0}</td>`;
      html += `<td class="ss-ns-hide-mobile">${goals.against || 0}</td>`;
      html += `<td>${details.goal_difference || 0}</td>`;
      html += `<td class="ss-ns-pts">${details.points || 0}</td>`;

      // Form Badges
      html += `<td class="ss-ns-hide-mobile"><div class="ss-ns-form">`;
      let formLimit = 5;
      for (let fIdx = 0; fIdx < formLimit; fIdx++) {
        if (formStr[fIdx] && formStr[fIdx].form) {
          let res = formStr[fIdx].form.toUpperCase();
          html += `<span class="ss-ns-badge ${res}">${res}</span>`;
        } else {
          html += `<span class="ss-ns-badge empty"></span>`;
        }
      }
      html += `</div></td></tr>`;
    }

    html += "</tbody></table>";
    $wrapper.find(".ss-ns-content").html(html);

    // Build Legend for Full Table
    if (!isLimit10) {
      let legendHtml = '<div class="ss-ns-legend-title">Key:</div>';
      for (const [rName, rColor] of Object.entries(rulesMap)) {
        legendHtml += `<div class="ss-ns-legend-item"><div class="ss-ns-legend-color" style="background:${rColor}"></div> ${rName}</div>`;
      }
      $wrapper.find(".ss-ns-legend").html(legendHtml);
    }
  }

  function init($widget) {
    let $wrapper = $widget.find(".ss-new-standing-wrapper");
    let seasonId = $wrapper.data("season-id");
    let isLimit10 = $wrapper.hasClass("ss-limit-10");

    if (!seasonId) return;

    $.ajax({
      url: SawahSports.restUrl + "/new-standings/" + seasonId,
      method: "GET",
      success: function (data) {
        // Store raw data
        $wrapper.data("raw-standings", data);
        // Render initial 'overall'
        renderTable($wrapper, data, "overall", isLimit10);
      },
    });

    // Tab events for Full table
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
