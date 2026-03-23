(function ($) {
  "use strict";

  function formatDate(dateStr, locale) {
    try {
      let d = new Date(dateStr + "T12:00:00");
      return d.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch (e) {
      return dateStr;
    }
  }

  function getScore(fx) {
    if (!fx.scores || !fx.scores.length) return null;
    let home = null,
      away = null;
    fx.scores.forEach((s) => {
      if (s.description === "CURRENT" && s.score) {
        if (s.score.participant === "home") home = s.score.goals;
        if (s.score.participant === "away") away = s.score.goals;
      }
    });
    if (home === null) return null;
    return { home, away };
  }

  function renderFixtures($wrapper, gwData, locale) {
    if (
      !gwData ||
      !gwData.fixtures ||
      Object.keys(gwData.fixtures).length === 0
    ) {
      let i18n = $wrapper.data("i18n") || {};
      $wrapper
        .find(".ss-nmf-fixtures")
        .html(
          `<div style="text-align:center;padding:30px;">${i18n.no_data || "No fixtures found."}</div>`,
        )
        .show();
      return;
    }

    let html = "";
    for (const [dateStr, matches] of Object.entries(gwData.fixtures)) {
      html += `<div class="ss-nmf-date-group">
                        <div class="ss-nmf-date-header">${formatDate(dateStr, locale)}</div>`;

      matches.forEach((fx) => {
        let home = fx.participants[0] || {};
        let away = fx.participants[1] || {};
        let state = fx.state && fx.state.short_name ? fx.state.short_name : "";

        let time = "";
        if (fx.starting_at && fx.starting_at.time) {
          time = fx.starting_at.time.substring(0, 5);
        }

        let score = getScore(fx);
        let centerHtml = "";

        if (score !== null) {
          centerHtml = `<div class="ss-nmf-score"><div class="ss-nmf-score-box">${score.home}</div><div class="ss-nmf-score-box">${score.away}</div></div>`;
        } else {
          centerHtml = `<div class="ss-nmf-time">${time}</div>`;
        }

        html += `
                <div class="ss-nmf-match">
                    <div class="ss-nmf-status">${state}</div>
                    <div class="ss-nmf-team ss-nmf-home">
                        <span>${home.name || ""}</span>
                        <img src="${home.image_path || ""}" class="ss-nmf-logo" loading="lazy">
                    </div>
                    <div class="ss-nmf-center">${centerHtml}</div>
                    <div class="ss-nmf-team ss-nmf-away">
                        <img src="${away.image_path || ""}" class="ss-nmf-logo" loading="lazy">
                        <span>${away.name || ""}</span>
                    </div>
                </div>`;
      });

      html += `</div>`;
    }

    $wrapper.find(".ss-nmf-fixtures").html(html).show();
  }

  function init($widget) {
    let $wrapper = $widget.find(".ss-nmf-wrapper");
    let seasonId = $wrapper.data("season-id");
    let locale = $wrapper.data("locale");
    let i18n = $wrapper.data("i18n") || {};

    if (!seasonId) return;

    $wrapper.find(".ss-nmf-fixtures").hide();
    $wrapper.find(".ss-nmf-loading").show();

    $.ajax({
      url: SawahSports.restUrl + "/new-matches-full/" + seasonId,
      method: "GET",
      success: function (data) {
        $wrapper.find(".ss-nmf-loading").hide();

        if (!data || !data.gameweeks || data.gameweeks.length === 0) {
          $wrapper
            .find(".ss-nmf-fixtures")
            .html(i18n.no_data || "No data")
            .show();
          return;
        }

        $wrapper.data("gameweeks", data.gameweeks);

        // Identify Active Game Week
        let activeGwId = data.current;
        if (!activeGwId)
          activeGwId = data.gameweeks[data.gameweeks.length - 1].id;

        // Build Slider Tabs
        let tabsHtml = "";
        data.gameweeks.forEach((gw) => {
          let activeClass = gw.id === activeGwId ? "active" : "";

          // Uses Loco Translate translation if numeric (e.g., "ΑΓΩΝΙΣΤΙΚΗ 26")
          let isNumeric = !isNaN(gw.name);
          let label = isNumeric
            ? `${i18n.gameweek || "Game Week"} ${gw.name}`
            : gw.name;

          tabsHtml += `<button class="ss-nmf-tab ${activeClass}" data-id="${gw.id}">${label}</button>`;
        });

        let $track = $wrapper.find(".ss-nmf-tabs-track");
        $track.html(tabsHtml);

        // Render the initial active fixtures
        let activeGwData =
          data.gameweeks.find((g) => g.id === activeGwId) || data.gameweeks[0];
        renderFixtures($wrapper, activeGwData, locale);

        // Auto-center the slider on the active tab
        setTimeout(() => {
          let $activeTab = $track.find(".active");
          if ($activeTab.length) {
            let trackWidth = $track.parent().width();
            let scrollPos =
              $activeTab.position().left -
              trackWidth / 2 +
              $activeTab.outerWidth() / 2;
            $track.animate({ scrollLeft: scrollPos }, 300);
          }
        }, 150);
      },
    });

    // Tab Click
    $wrapper.on("click", ".ss-nmf-tab", function () {
      let id = $(this).data("id");
      $wrapper.find(".ss-nmf-tab").removeClass("active");
      $(this).addClass("active");

      let gameweeks = $wrapper.data("gameweeks");
      let gwData = gameweeks.find((g) => g.id === id);
      renderFixtures($wrapper, gwData, locale);
    });

    // Arrows Click
    $wrapper.on("click", ".ss-nmf-nav.prev", function () {
      let $track = $wrapper.find(".ss-nmf-tabs-track");
      $track.animate({ scrollLeft: "-=150" }, 200);
    });
    $wrapper.on("click", ".ss-nmf-nav.next", function () {
      let $track = $wrapper.find(".ss-nmf-tabs-track");
      $track.animate({ scrollLeft: "+=150" }, 200);
    });
  }

  $(window).on("elementor/frontend/init", function () {
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/sawah_sports_new_matches_full.default",
      init,
    );
  });

  $(document).ready(function () {
    $(".elementor-widget-sawah_sports_new_matches_full").each(function () {
      init($(this));
    });
  });
})(jQuery);
