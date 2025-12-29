/**
 * Sawah Sports - Goal.com Style Matches Widget (FIXED)
 * Exact match to Goal.com design with working API
 */

(function ($) {
  "use strict";

  // Greek translations
  const i18n = {
    today: "Σήμερα",
    yesterday: "Χθες",
    tomorrow: "Αύριο",
    allCompetitions: "Όλες οι διοργανώσεις",
    loading: "Φόρτωση αγώνων...",
    noMatches: "Δεν υπάρχουν αγώνες",
    error: "Σφάλμα φόρτωσης",
    live: "LIVE",
    fullTime: "ΤΕΛ",
    halfTime: "ΗΧ",
    group: "Όμιλος",
    // Greek day names (3 letters)
    days: ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"],
    // Greek month names (3 letters)
    months: [
      "Ιαν",
      "Φεβ",
      "Μαρ",
      "Απρ",
      "Μάι",
      "Ιούν",
      "Ιούλ",
      "Αυγ",
      "Σεπ",
      "Οκτ",
      "Νοε",
      "Δεκ",
    ],
  };

  // Cyprus League IDs
  const CYPRUS_LEAGUE_IDS = [570, 215];

  class GoalStyleMatches {
    constructor(element) {
      this.$el = $(element);
      this.widgetId = this.$el.attr("id");
      this.cyprusPriority = this.$el.data("cyprus-priority") === "yes";
      this.autoRefresh = parseInt(this.$el.data("auto-refresh")) || 0;

      this.dates = [];
      this.currentDateIndex = 0;
      this.selectedDate = null;
      this.selectedCompetition = "all";
      this.allMatches = [];
      this.competitions = [];
      this.refreshTimer = null;

      this.init();
    }

    init() {
      this.generateDates();
      this.renderDateSlider();
      this.bindEvents();
      this.fetchMatches();

      if (this.autoRefresh > 0) {
        this.startAutoRefresh();
      }
    }

    generateDates() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 7 days: 3 before, today, 3 after
      for (let i = -3; i <= 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        this.dates.push(date);
      }

      this.currentDateIndex = 3; // Today
      this.selectedDate = this.dates[this.currentDateIndex];
    }

    renderDateSlider() {
      const $slider = this.$el.find(".ss-goal-date-slider");
      $slider.empty();

      this.dates.forEach((date, index) => {
        const isToday = this.isToday(date);
        const isActive = index === this.currentDateIndex;
        const label = this.getDateLabel(date);
        const displayDate = this.formatDateDisplay(date);

        const $item = $(`
          <div class="ss-goal-date-item ${isActive ? "active" : ""} ${
          isToday ? "today" : ""
        }" data-index="${index}">
            <span class="ss-goal-date-label">${label}</span>
            <span class="ss-goal-date-display">${displayDate}</span>
          </div>
        `);

        $slider.append($item);
      });

      this.scrollToActiveDate();
    }

    getDateLabel(date) {
      if (this.isToday(date)) return i18n.today;
      if (this.isYesterday(date)) return i18n.yesterday;
      if (this.isTomorrow(date)) return i18n.tomorrow;
      return i18n.days[date.getDay()];
    }

    formatDateDisplay(date) {
      // Single line: "26 Δεκ"
      return `${date.getDate()} ${i18n.months[date.getMonth()]}`;
    }

    formatDateISO(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    isToday(date) {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }

    isYesterday(date) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return date.toDateString() === yesterday.toDateString();
    }

    isTomorrow(date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return date.toDateString() === tomorrow.toDateString();
    }

    scrollToActiveDate() {
      const $slider = this.$el.find(".ss-goal-date-slider");
      const $active = $slider.find(".ss-goal-date-item.active");

      if ($active.length) {
        const scrollLeft =
          $active.position().left +
          $slider.scrollLeft() -
          $slider.width() / 2 +
          $active.width() / 2;
        $slider.animate({ scrollLeft: scrollLeft }, 300);
      }
    }

    bindEvents() {
      // Date navigation
      this.$el.on("click", ".ss-goal-date-item", (e) => {
        const index = parseInt($(e.currentTarget).data("index"));
        this.selectDate(index);
      });

      this.$el.on("click", ".ss-goal-prev", () => {
        if (this.currentDateIndex > 0) {
          this.selectDate(this.currentDateIndex - 1);
        }
      });

      this.$el.on("click", ".ss-goal-next", () => {
        if (this.currentDateIndex < this.dates.length - 1) {
          this.selectDate(this.currentDateIndex + 1);
        }
      });

      // Competition filter
      this.$el.on("change", ".ss-goal-comp-dropdown", (e) => {
        this.selectedCompetition = $(e.target).val();
        this.renderMatches();
      });
    }

    selectDate(index) {
      this.currentDateIndex = index;
      this.selectedDate = this.dates[index];

      this.$el.find(".ss-goal-date-item").removeClass("active");
      this.$el
        .find(`.ss-goal-date-item[data-index="${index}"]`)
        .addClass("active");

      this.scrollToActiveDate();
      this.fetchMatches();
    }

    fetchMatches() {
      this.showLoading();

      const dateStr = this.formatDateISO(this.selectedDate);

      // Use correct REST endpoint with query parameter
      const endpoint = `${SawahSports.restUrl}/fixtures?date=${dateStr}`;

      console.log("Fetching matches from:", endpoint);

      $.ajax({
        url: endpoint,
        method: "GET",
        beforeSend: (xhr) => {
          xhr.setRequestHeader("X-WP-Nonce", SawahSports.nonce);
        },
        success: (response) => {
          console.log("API Response:", response);

          let data = response;

          // Handle WordPress REST wrapper
          if (response.success !== undefined && response.data) {
            data = response.data;
          }

          // Handle Sportmonks structure: { data: [...] }
          if (data.data && Array.isArray(data.data)) {
            this.allMatches = data.data;
          } else if (Array.isArray(data)) {
            this.allMatches = data;
          } else {
            console.error("Unexpected data structure:", data);
            this.showError(i18n.error);
            return;
          }

          console.log(`Loaded ${this.allMatches.length} matches`);

          this.processMatches();
          this.buildCompetitionFilter();
          this.renderMatches();
        },
        error: (xhr) => {
          console.error("Matches fetch error:", xhr);
          const errorMsg =
            xhr.responseJSON?.message || xhr.statusText || i18n.error;
          this.showError(errorMsg);
        },
      });
    }

    processMatches() {
      // Sort by Cyprus priority + time
      this.allMatches.sort((a, b) => {
        if (this.cyprusPriority) {
          const aIsCyprus = CYPRUS_LEAGUE_IDS.includes(
            a.league?.id || a.league_id
          );
          const bIsCyprus = CYPRUS_LEAGUE_IDS.includes(
            b.league?.id || b.league_id
          );

          if (aIsCyprus && !bIsCyprus) return -1;
          if (!aIsCyprus && bIsCyprus) return 1;
        }

        // Sort by time
        const aTime = a.starting_at || a.time?.starting_at;
        const bTime = b.starting_at || b.time?.starting_at;
        return new Date(aTime) - new Date(bTime);
      });

      // Extract competitions
      const compMap = {};
      this.allMatches.forEach((match) => {
        const league = match.league;
        if (!league) return;

        const leagueId = league.id;
        if (!compMap[leagueId]) {
          compMap[leagueId] = {
            id: leagueId,
            name: league.name || "Unknown",
            country: league.country?.name || "",
            isCyprus: CYPRUS_LEAGUE_IDS.includes(leagueId),
          };
        }
      });

      this.competitions = Object.values(compMap);

      // Sort: Cyprus first, then alphabetically
      this.competitions.sort((a, b) => {
        if (this.cyprusPriority) {
          if (a.isCyprus && !b.isCyprus) return -1;
          if (!a.isCyprus && b.isCyprus) return 1;
        }
        return a.name.localeCompare(b.name, "el");
      });
    }

    buildCompetitionFilter() {
      const $dropdown = this.$el.find(".ss-goal-comp-dropdown");
      const currentValue = $dropdown.val();

      $dropdown.empty();
      $dropdown.append(`<option value="all">${i18n.allCompetitions}</option>`);

      this.competitions.forEach((comp) => {
        const cyprusMarker = comp.isCyprus ? " ★" : "";
        $dropdown.append(`
          <option value="${comp.id}">${comp.name}${cyprusMarker}</option>
        `);
      });

      // Restore selection
      if (
        currentValue &&
        $dropdown.find(`option[value="${currentValue}"]`).length
      ) {
        $dropdown.val(currentValue);
      } else {
        $dropdown.val("all");
        this.selectedCompetition = "all";
      }
    }

    renderMatches() {
      const $container = this.$el.find(".ss-goal-matches-container");

      // Filter by competition
      let matches = this.allMatches;
      if (this.selectedCompetition !== "all") {
        matches = matches.filter(
          (m) =>
            (m.league?.id || m.league_id) === parseInt(this.selectedCompetition)
        );
      }

      if (matches.length === 0) {
        this.showEmpty();
        return;
      }

      // Group by competition
      const grouped = {};
      matches.forEach((match) => {
        const league = match.league;
        if (!league) return;

        const leagueId = league.id;
        if (!grouped[leagueId]) {
          grouped[leagueId] = {
            league: league,
            matches: [],
          };
        }
        grouped[leagueId].matches.push(match);
      });

      // Build HTML
      let html = "";
      Object.values(grouped).forEach((group) => {
        html += this.buildCompetitionGroup(group);
      });

      $container.html(html);

      // Auto-refresh if live matches
      if (this.hasLiveMatches(matches) && this.autoRefresh > 0) {
        this.scheduleRefresh();
      }
    }

    buildCompetitionGroup(group) {
      const league = group.league;
      const isCyprus = CYPRUS_LEAGUE_IDS.includes(league.id);

      let html = '<div class="ss-goal-comp-group">';

      // Header
      html += '<div class="ss-goal-comp-header">';
      html += '<span class="ss-goal-comp-icon">⚽</span>';
      html += `<span class="ss-goal-comp-name">${this.escapeHtml(
        league.name || "Unknown"
      )}`;
      if (isCyprus) {
        html += '<span class="ss-goal-cyprus-badge">CY</span>';
      }
      html += "</span>";
      if (league.country?.name) {
        html += `<span class="ss-goal-comp-meta">${this.escapeHtml(
          league.country.name
        )}</span>`;
      }
      html += "</div>";

      // Matches
      group.matches.forEach((match) => {
        html += this.buildMatchCard(match);
      });

      html += "</div>";
      return html;
    }

    buildMatchCard(match) {
      const isLive = this.isMatchLive(match);
      const isFinished = this.isMatchFinished(match);
      const participants = match.participants || [];

      const homeTeam = participants.find((p) => p.meta?.location === "home");
      const awayTeam = participants.find((p) => p.meta?.location === "away");

      const score = this.getScore(match);
      const timeInfo = this.getTimeInfo(match, isLive, isFinished);
      const groupInfo = this.getGroupInfo(match);

      let html = '<div class="ss-goal-match';
      if (isLive) html += " live";
      if (isFinished) html += " finished";
      html += '">';

      // Time
      html += '<div class="ss-goal-match-time">';
      html += `<span class="ss-goal-time-text">${timeInfo.time}</span>`;
      if (timeInfo.status) {
        html += `<span class="ss-goal-status-badge">${timeInfo.status}</span>`;
      }
      html += "</div>";

      // Home Team
      html += '<div class="ss-goal-team-home">';
      if (homeTeam?.image_path) {
        html += `<img src="${this.escapeHtml(
          homeTeam.image_path
        )}" alt="" class="ss-goal-team-flag" loading="lazy">`;
      }
      html += `<span class="ss-goal-team-code">${this.escapeHtml(
        this.getTeamCode(homeTeam)
      )}</span>`;
      html += "</div>";

      // Score
      html += '<div class="ss-goal-score-wrapper">';
      html += `<div class="ss-goal-score-badge">${score.home}</div>`;
      html += '<span class="ss-goal-score-separator">:</span>';
      html += `<div class="ss-goal-score-badge">${score.away}</div>`;
      html += "</div>";

      // Away Team
      html += '<div class="ss-goal-team-away">';
      html += `<span class="ss-goal-team-code">${this.escapeHtml(
        this.getTeamCode(awayTeam)
      )}</span>`;
      if (awayTeam?.image_path) {
        html += `<img src="${this.escapeHtml(
          awayTeam.image_path
        )}" alt="" class="ss-goal-team-flag" loading="lazy">`;
      }
      html += "</div>";

      // Match Info
      html += '<div class="ss-goal-match-info">';
      if (groupInfo) {
        html += `<span class="ss-goal-group-badge">${groupInfo}</span>`;
      }
      html += "</div>";

      html += "</div>";
      return html;
    }

    getTeamCode(team) {
      if (!team) return "TBD";
      return (
        team.short_code || team.name?.substring(0, 3).toUpperCase() || "TBD"
      );
    }

    isMatchLive(match) {
      const state = match.state || {};
      const short = (state.short_name || state.short || "").toUpperCase();
      return ["LIVE", "HT", "ET", "BREAK", "INPLAY"].some((s) =>
        short.includes(s)
      );
    }

    isMatchFinished(match) {
      const state = match.state || {};
      const short = (state.short_name || state.short || "").toUpperCase();
      return ["FT", "AET", "FT_PEN", "FINISHED"].some((s) => short.includes(s));
    }

    getScore(match) {
      const scores = match.scores || [];
      let home = "—";
      let away = "—";

      for (const score of scores) {
        const desc = (score.description || "").toLowerCase();
        if (desc.includes("current") || desc.includes("final")) {
          const data = score.score || {};
          home = data.home ?? data.participant_home ?? "—";
          away = data.away ?? data.participant_away ?? "—";
          break;
        }
      }

      return { home, away };
    }

    getTimeInfo(match, isLive, isFinished) {
      let time = "";
      let status = "";

      if (isLive) {
        const state = match.state || {};
        const minute = match.minute || state.minute || "";
        time = minute ? `${minute}'` : i18n.live;
        status = i18n.live;
      } else if (isFinished) {
        time = i18n.fullTime;
        status = "";
      } else {
        const startTime = match.starting_at || match.time?.starting_at;
        if (startTime) {
          const date = new Date(startTime);
          time = `${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes()
          ).padStart(2, "0")}`;
        } else {
          time = "—";
        }
      }

      return { time, status };
    }

    getGroupInfo(match) {
      const round = match.round?.name || match.round_name || "";
      const stage = match.stage?.name || match.stage_name || "";

      if (round && round.toLowerCase().includes("group")) {
        const groupMatch = round.match(/Group\s+([A-Z])/i);
        return groupMatch ? `${i18n.group} ${groupMatch[1]}` : round;
      }
      if (stage && stage.toLowerCase().includes("group")) {
        const groupMatch = stage.match(/Group\s+([A-Z])/i);
        return groupMatch ? `${i18n.group} ${groupMatch[1]}` : stage;
      }

      return "";
    }

    hasLiveMatches(matches) {
      return matches.some((m) => this.isMatchLive(m));
    }

    scheduleRefresh() {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }

      this.refreshTimer = setTimeout(() => {
        console.log("Auto-refreshing...");
        this.fetchMatches();
      }, this.autoRefresh * 1000);
    }

    startAutoRefresh() {
      if (this.hasLiveMatches(this.allMatches)) {
        this.scheduleRefresh();
      }
    }

    showLoading() {
      this.$el.find(".ss-goal-matches-container").html(`
        <div class="ss-goal-loading">
          <div class="ss-goal-spinner"></div>
          <p>${i18n.loading}</p>
        </div>
      `);
    }

    showEmpty() {
      this.$el.find(".ss-goal-matches-container").html(`
        <div class="ss-goal-empty">
          <div class="ss-goal-empty-icon">⚽</div>
          <p class="ss-goal-empty-text">${i18n.noMatches}</p>
        </div>
      `);
    }

    showError(message) {
      this.$el.find(".ss-goal-matches-container").html(`
        <div class="ss-goal-error">${this.escapeHtml(message)}</div>
      `);
    }

    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    destroy() {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }
    }
  }

  // Initialize
  function initWidgets() {
    $(".ss-goal-matches").each(function () {
      if (!$(this).data("goal-matches-instance")) {
        const instance = new GoalStyleMatches(this);
        $(this).data("goal-matches-instance", instance);
      }
    });
  }

  // Elementor preview
  $(window).on("elementor/frontend/init", function () {
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/sawah_sports_goal_matches.default",
      function ($scope) {
        const $widget = $scope.find(".ss-goal-matches");
        if ($widget.length && !$widget.data("goal-matches-instance")) {
          new GoalStyleMatches($widget[0]);
        }
      }
    );
  });

  // Regular page load
  $(document).ready(initWidgets);
})(jQuery);
