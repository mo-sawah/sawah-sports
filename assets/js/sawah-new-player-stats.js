(function ($) {
  "use strict";

  // Format Name: "E. Haaland"
  function formatName(player) {
    if (!player) return "Unknown";
    let first = player.firstname || "";
    let last = player.lastname || player.display_name || "";

    if (first && last && first !== last) {
      return first.charAt(0).toUpperCase() + ". " + last;
    }
    return last || first || "Unknown";
  }

  function renderCard(title, dataArray, noDataText) {
    let html = `<div class="ss-nps-card"><div class="ss-nps-card-title">${title}</div><div class="ss-nps-list">`;

    if (!dataArray || dataArray.length === 0) {
      html += `<div class="ss-nps-empty">${noDataText}</div>`;
    } else {
      // Sort by total DESC
      dataArray.sort((a, b) => (b.total || 0) - (a.total || 0));

      // Limit to Top 10
      let limit = Math.min(dataArray.length, 10);
      for (let i = 0; i < limit; i++) {
        let item = dataArray[i];
        let rank = item.position || i + 1;
        let teamLogo =
          item.participant && item.participant.image_path
            ? item.participant.image_path
            : "";
        let playerName = formatName(item.player);
        let statValue = item.total || 0;

        html += `
                <div class="ss-nps-row">
                    <div class="ss-nps-rank">${rank}</div>
                    <img src="${teamLogo}" class="ss-nps-team" loading="lazy">
                    <div class="ss-nps-player">${playerName}</div>
                    <div class="ss-nps-stat">${statValue}</div>
                </div>`;
      }
    }
    html += `</div></div>`;
    return html;
  }

  function init($widget) {
    let $wrapper = $widget.find(".ss-nps-wrapper");
    let seasonId = $wrapper.data("season-id");
    let i18n = $wrapper.data("i18n") || {};

    if (!seasonId) return;

    $.ajax({
      url: SawahSports.restUrl + "/new-player-stats/" + seasonId,
      method: "GET",
      success: function (data) {
        $wrapper.find(".ss-nps-loading").hide();

        // Group data by Type
        let grouped = {
          goals: [],
          assists: [],
          shots: [],
          fouls: [],
          yellow: [],
          red: [],
        };

        if (Array.isArray(data)) {
          data.forEach((item) => {
            let typeName =
              item.type && item.type.name ? item.type.name.toLowerCase() : "";
            let typeCode =
              item.type && item.type.code ? item.type.code.toLowerCase() : "";

            if (typeName.includes("goal") || typeCode.includes("goal"))
              grouped.goals.push(item);
            else if (typeName.includes("assist") || typeCode.includes("assist"))
              grouped.assists.push(item);
            else if (typeName.includes("yellow") || typeCode.includes("yellow"))
              grouped.yellow.push(item);
            else if (typeName.includes("red") || typeCode.includes("red"))
              grouped.red.push(item);
            else if (typeName.includes("shot") && typeName.includes("target"))
              grouped.shots.push(item);
            else if (typeName.includes("foul")) grouped.fouls.push(item);
          });
        }

        // Render the 6 cards
        let gridHtml = "";
        gridHtml += renderCard(i18n.goals, grouped.goals, i18n.no_data);
        gridHtml += renderCard(i18n.assists, grouped.assists, i18n.no_data);
        gridHtml += renderCard(i18n.red, grouped.red, i18n.no_data); // Top row

        gridHtml += renderCard(i18n.yellow, grouped.yellow, i18n.no_data); // Bottom row
        gridHtml += renderCard(i18n.shots, grouped.shots, i18n.no_data);
        gridHtml += renderCard(i18n.fouls, grouped.fouls, i18n.no_data);

        $wrapper.find(".ss-nps-grid").html(gridHtml).show();
      },
    });
  }

  $(window).on("elementor/frontend/init", function () {
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/sawah_sports_new_player_stats.default",
      init,
    );
  });

  $(document).ready(function () {
    $(".elementor-widget-sawah_sports_new_player_stats").each(function () {
      init($(this));
    });
  });
})(jQuery);
