/**
 * Sawah Sports - New Fixtures & Results Widget
 * Renders last-round results + upcoming fixtures grouped by date.
 * Matches BBC Sport / screenshot layout exactly.
 */
(function ($) {
  "use strict";

  /* ── Constants ── */
  var FINISHED = [
    "FT",
    "AET",
    "PEN",
    "CANC",
    "CANCELLED",
    "AWARDED",
    "POSTP",
    "POSTPONED",
    "ABD",
    "ABANDONED",
    "INT",
    "WO",
  ];
  var LIVE = [
    "LIVE",
    "HT",
    "ET",
    "PEN_LIVE",
    "1H",
    "2H",
    "EXTRA_TIME",
    "BREAK",
    "BREAK_TIME",
    "INPLAY",
  ];

  /* ── Helpers ── */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  /**
   * Format a date string "YYYY-MM-DD" to a localized label like
   * "Κυριακή 22 Μαρτίου" or "Sunday 22 March"
   */
  function formatDateLabel(dateStr, locale) {
    try {
      // Use noon to avoid UTC midnight timezone shifts
      var d = new Date(dateStr + "T12:00:00");
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(locale || "el-GR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Extract match start time as "HH:MM" from fixture object.
   * Handles both Sportmonks v3 object format and raw string.
   */
  function getTime(fx) {
    var sa = fx.starting_at;
    if (!sa) return "--:--";

    if (typeof sa === "object") {
      if (sa.time) return sa.time.substring(0, 5);
      if (sa.timestamp) {
        var d = new Date(sa.timestamp * 1000);
        return (
          d.getUTCHours().toString().padStart(2, "0") +
          ":" +
          d.getUTCMinutes().toString().padStart(2, "0")
        );
      }
      if (sa.datetime) return sa.datetime.substring(11, 16);
    }

    if (typeof sa === "string" && sa.length >= 16) {
      return sa.substring(11, 16);
    }

    return "--:--";
  }

  /**
   * Classify the fixture state.
   * Returns { type: 'finished'|'live'|'upcoming', label: string }
   */
  function getState(fx) {
    var s = fx.state || {};
    var short = (
      s.short_name ||
      s.developer_name ||
      s.name ||
      ""
    ).toUpperCase();

    if (!short) return { type: "upcoming", label: "--:--" };

    for (var i = 0; i < LIVE.length; i++) {
      if (short === LIVE[i] || short.indexOf(LIVE[i]) === 0) {
        return { type: "live", label: short };
      }
    }

    for (var j = 0; j < FINISHED.length; j++) {
      if (short === FINISHED[j] || short.indexOf(FINISHED[j]) === 0) {
        // Normalise cancelled/postponed labels
        var label = short;
        if (short === "FT" || short === "AET" || short === "PEN") {
          label = short;
        } else if (
          short.indexOf("CANC") === 0 ||
          short.indexOf("POSTP") === 0
        ) {
          label = short.substring(0, 4);
        }
        return { type: "finished", label: label };
      }
    }

    return { type: "upcoming", label: null };
  }

  /**
   * Extract the best available score from the scores array.
   */
  function getScore(fx) {
    var scores = fx.scores;
    if (!scores || !scores.length) return null;

    var preferred = [
      "CURRENT",
      "2ND_HALF",
      "FT",
      "AFTER_EXTRA_TIME",
      "AFTER_PENALTIES",
    ];
    var found = null;

    for (var p = 0; p < preferred.length; p++) {
      for (var i = 0; i < scores.length; i++) {
        if (scores[i].description === preferred[p]) {
          found = scores[i];
          break;
        }
      }
      if (found) break;
    }

    if (!found) found = scores[scores.length - 1];
    if (!found || !found.score) return null;

    var score = found.score;
    var goals = score.goals || score;
    var homeG =
      goals.home != null
        ? goals.home
        : score.home_score != null
          ? score.home_score
          : "-";
    var awayG =
      goals.away != null
        ? goals.away
        : score.away_score != null
          ? score.away_score
          : "-";

    return { home: homeG, away: awayG };
  }

  /**
   * Extract home and away participant objects.
   */
  function getTeams(fx) {
    var parts = fx.participants || [];

    var home = null,
      away = null;
    for (var i = 0; i < parts.length; i++) {
      var meta = parts[i].meta || {};
      var loc = meta.location || meta.type || "";
      if (loc === "home" && !home) home = parts[i];
      if (loc === "away" && !away) away = parts[i];
    }

    // Fallback: first = home, second = away
    if (!home) home = parts[0] || {};
    if (!away) away = parts[1] || {};

    return { home: home, away: away };
  }

  /* ── Renderers ── */

  function logoHtml(team, side) {
    var img = team.image_path || "";
    var name = esc(team.name || team.short_code || "?");
    var abbr = esc((team.name || "???").substring(0, 3).toUpperCase());

    if (img) {
      return (
        '<img src="' +
        esc(img) +
        '" alt="' +
        name +
        '" ' +
        'class="ss-fr-logo" loading="lazy" ' +
        "onerror=\"this.style.display='none';this.nextElementSibling.style.display='flex'\">" +
        '<span class="ss-fr-logo-fallback" style="display:none">' +
        abbr +
        "</span>"
      );
    }
    return '<span class="ss-fr-logo-fallback">' + abbr + "</span>";
  }

  function renderMatch(fx) {
    var teams = getTeams(fx);
    var state = getState(fx);
    var home = teams.home;
    var away = teams.away;
    var hName = esc(home.name || home.short_code || "");
    var aName = esc(away.name || away.short_code || "");

    var statusHtml = "";
    var scoreHtml = "";

    if (state.type === "finished" || state.type === "live") {
      var sc = getScore(fx);
      var hGoal = sc ? esc(sc.home) : "-";
      var aGoal = sc ? esc(sc.away) : "-";
      var isLive = state.type === "live";
      var label = isLive ? state.label : "FT";

      statusHtml =
        '<div class="ss-fr-status ' +
        (isLive ? "live" : "finished") +
        '">' +
        esc(label) +
        "</div>";

      scoreHtml =
        '<div class="ss-fr-score ' +
        (isLive ? "live" : "") +
        '">' +
        '<span class="ss-fr-score-num">' +
        hGoal +
        "</span>" +
        '<span class="ss-fr-score-num">' +
        aGoal +
        "</span>" +
        "</div>";
    } else {
      // Upcoming
      var time = getTime(fx);
      statusHtml = '<div class="ss-fr-status upcoming"></div>';
      scoreHtml = '<div class="ss-fr-time">' + esc(time) + "</div>";
    }

    return (
      '<div class="ss-fr-match">' +
      statusHtml +
      '<div class="ss-fr-match-content">' +
      '<div class="ss-fr-teams-row">' +
      '<div class="ss-fr-home">' +
      '<span class="ss-fr-team-name">' +
      hName +
      "</span>" +
      logoHtml(home, "home") +
      "</div>" +
      scoreHtml +
      '<div class="ss-fr-away">' +
      logoHtml(away, "away") +
      '<span class="ss-fr-team-name">' +
      aName +
      "</span>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function renderDateGroup(dateStr, fixtures, locale) {
    var label = formatDateLabel(dateStr, locale);
    var matchesHtml = "";

    // Sort fixtures within a date group by kick-off time
    fixtures.sort(function (a, b) {
      var tA =
        a.starting_at && a.starting_at.timestamp ? a.starting_at.timestamp : 0;
      var tB =
        b.starting_at && b.starting_at.timestamp ? b.starting_at.timestamp : 0;
      return tA - tB;
    });

    for (var i = 0; i < fixtures.length; i++) {
      matchesHtml += renderMatch(fixtures[i]);
    }

    return (
      '<div class="ss-fr-date-group">' +
      '<div class="ss-fr-date-header">' +
      esc(label) +
      "</div>" +
      '<div class="ss-fr-matches">' +
      matchesHtml +
      "</div>" +
      "</div>"
    );
  }

  function render($widget, data) {
    var locale = $widget.data("locale") || "el-GR";
    var moreUrl = $widget.data("more-url") || "";
    var moreText = $widget.data("more-text") || "More";
    var external =
      $widget.data("more-external") === 1 ||
      $widget.data("more-external") === "1";

    var html = "";

    /* Past groups — newest first (already sorted by PHP, keys in desc order) */
    var past = data.past || {};
    var pastDates = Object.keys(past).sort().reverse(); // desc
    for (var i = 0; i < pastDates.length; i++) {
      html += renderDateGroup(pastDates[i], past[pastDates[i]], locale);
    }

    /* Upcoming groups — soonest first */
    var upcoming = data.upcoming || {};
    var upcomingDates = Object.keys(upcoming).sort(); // asc
    for (var j = 0; j < upcomingDates.length; j++) {
      html += renderDateGroup(
        upcomingDates[j],
        upcoming[upcomingDates[j]],
        locale,
      );
    }

    if (!html) {
      html = '<div class="ss-fr-empty">No fixtures available.</div>';
    }

    /* More button */
    if (moreUrl) {
      var target = external ? ' target="_blank" rel="noopener noreferrer"' : "";
      html +=
        '<div class="ss-fr-more-wrapper">' +
        '<a href="' +
        esc(moreUrl) +
        '" class="ss-fr-more-btn"' +
        target +
        ">" +
        esc(moreText) +
        "</a>" +
        "</div>";
    }

    $widget.find(".ss-fr-body").html(html);
  }

  /* ── Bootstrap ── */

  function init($widget) {
    var seasonId = $widget.data("season-id");
    var pastDates = $widget.data("past-dates") || 1;
    var upcomingDates = $widget.data("upcoming-dates") || 3;

    if (!seasonId || seasonId === 0) {
      $widget
        .find(".ss-fr-body")
        .html(
          '<div class="ss-fr-empty">⚙️ Please set a Sportmonks Season ID in the widget settings.</div>',
        );
      return;
    }

    var url =
      SawahSports.restUrl +
      "/season-fixtures/" +
      seasonId +
      "?past_dates=" +
      pastDates +
      "&upcoming_dates=" +
      upcomingDates;

    $.ajax({
      url: url,
      method: "GET",
      beforeSend: function (xhr) {
        xhr.setRequestHeader("X-WP-Nonce", SawahSports.nonce);
      },
      success: function (data) {
        render($widget, data);
      },
      error: function (xhr) {
        var msg = "Unable to load fixtures.";
        try {
          var r = JSON.parse(xhr.responseText);
          if (r && r.message) msg = r.message;
        } catch (e) {}
        $widget
          .find(".ss-fr-body")
          .html('<div class="ss-fr-error">' + esc(msg) + "</div>");
      },
    });
  }

  /* Plain page load */
  $(document).ready(function () {
    $(".ss-fixtures-results").each(function () {
      init($(this));
    });
  });

  /* Elementor preview / frontend init */
  $(window).on("elementor/frontend/init", function () {
    if (window.elementorFrontend && elementorFrontend.hooks) {
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/sawah_sports_fixtures_results.default",
        function ($scope) {
          $scope.find(".ss-fixtures-results").each(function () {
            init($(this));
          });
        },
      );
    }
  });
})(jQuery);
