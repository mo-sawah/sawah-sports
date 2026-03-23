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

  function renderFixtures($wrapper, gameweeks, targetGw, locale) {
    let gwData = gameweeks[targetGw];
    if (!gwData || !gwData.fixtures) {
      $wrapper
        .find(".ss-nmf-fixtures")
        .html(
          '<div style="text-align:center;padding:30px;">No fixtures found.</div>',
        );
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
                        <img src="${home.image_path || ""}" class="ss-nmf-logo">
                    </div>
                    <div class="ss-nmf-center">${centerHtml}</div>
                    <div class="ss-nmf-team ss-nmf-away">
                        <img src="${away.image_path || ""}" class="ss-nmf-logo">
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

        if (
          !data ||
          !data.gameweeks ||
          Object.keys(data.gameweeks).length === 0
        ) {
          $wrapper.find(".ss-nmf-fixtures").html(i18n.no_data).show();
          return;
        }

        $wrapper.data("gameweeks", data.gameweeks);

        // Build Slider Tabs
        let tabsHtml = "";
        let activeGw = data.current || Object.keys(data.gameweeks)[0];

        // Sort gameweek names numerically if possible
        let gwNames = Object.keys(data.gameweeks).sort((a, b) => {
          let numA = parseInt(a.replace(/\D/g, "")) || 0;
          let numB = parseInt(b.replace(/\D/g, "")) || 0;
          return numA - numB;
        });

        gwNames.forEach((gw) => {
          let activeClass = gw === activeGw ? "active" : "";
          let label = isNaN(gw) ? gw : `${i18n.gameweek} ${gw}`; // Translates "Game Week 27"
          tabsHtml += `<button class="ss-nmf-tab ${activeClass}" data-gw="${gw}">${label}</button>`;
        });

        let $track = $wrapper.find(".ss-nmf-tabs-track");
        $track.html(tabsHtml);

        renderFixtures($wrapper, data.gameweeks, activeGw, locale);

        // Auto-scroll track to active tab
        let $activeTab = $track.find(".active");
        if ($activeTab.length) {
          $track.animate({ scrollLeft: $activeTab.position().left - 50 }, 300);
        }
      },
    });

    // Tab Click
    $wrapper.on("click", ".ss-nmf-tab", function () {
      let gw = $(this).data("gw");
      $wrapper.find(".ss-nmf-tab").removeClass("active");
      $(this).addClass("active");
      let gameweeks = $wrapper.data("gameweeks");
      renderFixtures($wrapper, gameweeks, gw, locale);
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
