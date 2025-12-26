/**
 * Sawah Sports - Premium Today's Matches Widget
 * Features: Date Slider, Priority Sorting, Search, Live Filter
 */
(function ($) {
  "use strict";

  // --- CONFIGURATION: LEAGUE PRIORITY ---
  // Lower number = Higher priority
  const PRIORITY_MAP = {
    // 1. Cyprus (Highest)
    253: 1, // 1. Division
    259: 2, // Cyprus Cup
    3214: 3, // Super Cup

    // 2. Europe
    2: 10, // Champions League
    5: 11, // Europa League

    // 3. England
    8: 20, // Premier League
    24: 21, // FA Cup
    23: 22, // Community Shield

    // 4. Spain
    564: 30, // La Liga

    // 5. France, Germany, Italy
    301: 40, // Ligue 1
    82: 40, // Bundesliga
    384: 40, // Serie A

    // 6. Greece
    325: 50, // Super League
    331: 51, // Greek Cup
  };

  const DEFAULT_PRIORITY = 999;

  // --- WIDGET LOGIC ---
  class TodaysMatches {
    constructor(container) {
      this.$el = $(container);
      this.state = {
        date: new Date(),
        fixtures: [],
        filter: "all", // 'all' | 'live'
        search: "",
      };

      this.init();
    }

    init() {
      this.renderDateSlider();
      this.bindEvents();
      this.loadData();
    }

    bindEvents() {
      // Filters
      this.$el.find(".ss-filter-btn").on("click", (e) => {
        const $btn = $(e.currentTarget);
        this.$el.find(".ss-filter-btn").removeClass("active");
        $btn.addClass("active");
        this.state.filter = $btn.data("filter");
        this.renderMatches();
      });

      // Search
      this.$el.find(".ss-match-search").on("keyup", (e) => {
        this.state.search = e.target.value.toLowerCase();
        this.renderMatches();
      });

      // Date Nav Buttons
      this.$el.find(".ss-prev").on("click", () => this.changeDate(-1));
      this.$el.find(".ss-next").on("click", () => this.changeDate(1));

      // Hidden Date Input
      this.$el.find(".ss-date-input-hidden").on("change", (e) => {
        if (e.target.value) {
          this.state.date = new Date(e.target.value);
          this.renderDateSlider();
          this.loadData();
        }
      });
    }

    changeDate(days) {
      const d = new Date(this.state.date);
      d.setDate(d.getDate() + days);
      this.state.date = d;
      this.renderDateSlider();
      this.loadData();
    }

    renderDateSlider() {
      const $slider = this.$el.find(".ss-date-slider");
      $slider.empty();

      // Render 7 days before and after
      for (let i = -7; i <= 7; i++) {
        const d = new Date(this.state.date);
        d.setDate(d.getDate() + i);

        const isToday = new Date().toDateString() === d.toDateString();
        const isSelected = i === 0;

        const dayName = isToday
          ? "Today"
          : d.toLocaleDateString("en-US", { weekday: "short" });
        const dayNum = d.getDate();

        const $item = $(`
                    <div class="ss-date-item ${isSelected ? "active" : ""}">
                        <span class="ss-date-day">${dayName}</span>
                        <span class="ss-date-num">${dayNum}</span>
                    </div>
                `);

        $item.on("click", () => {
          this.state.date = d;
          this.renderDateSlider();
          this.loadData();
        });

        $slider.append($item);
      }

      // Scroll to center
      setTimeout(() => {
        const scrollLeft =
          ($slider[0].scrollWidth - $slider[0].clientWidth) / 2;
        $slider.animate({ scrollLeft: scrollLeft }, 300);
      }, 10);
    }

    async loadData() {
      const $wrapper = this.$el.find(".ss-matches-list-wrapper");
      $wrapper.html(
        '<div class="ss-loading"><div class="ss-spinner"></div></div>'
      );

      try {
        // Format Date YYYY-MM-DD
        const dateStr = this.state.date.toISOString().split("T")[0];

        // Use global SawahSports object for URL
        const url = `${SawahSports.restUrl}/fixtures?date=${dateStr}`;

        const res = await $.ajax({
          url: url,
          headers: { "X-WP-Nonce": SawahSports.nonce },
        });

        // Handle API response structure
        this.state.fixtures = res.data || res || [];

        // Update Live Count UI
        const liveCount = this.state.fixtures.filter((f) =>
          this.isLive(f)
        ).length;
        this.$el.find(".ss-live-count").text(`(${liveCount})`);

        this.renderMatches();
      } catch (err) {
        console.error(err);
        $wrapper.html('<div class="ss-empty">Unable to load matches.</div>');
      }
    }

    renderMatches() {
      const $wrapper = this.$el.find(".ss-matches-list-wrapper");
      $wrapper.empty();

      // 1. Filter Data
      let filtered = this.state.fixtures.filter((fx) => {
        // Live Filter
        if (this.state.filter === "live" && !this.isLive(fx)) return false;

        // Search Filter
        if (this.state.search) {
          const q = this.state.search;
          const home = this.getTeam(fx, "home")?.name.toLowerCase() || "";
          const away = this.getTeam(fx, "away")?.name.toLowerCase() || "";
          const league = fx.league?.name?.toLowerCase() || "";
          if (!home.includes(q) && !away.includes(q) && !league.includes(q))
            return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        $wrapper.html(
          '<div class="ss-empty">No matches found for this selection.</div>'
        );
        return;
      }

      // 2. Group by League
      const groups = {};
      filtered.forEach((fx) => {
        const lid = fx.league?.id || 0;
        if (!groups[lid]) {
          groups[lid] = { league: fx.league, matches: [] };
        }
        groups[lid].matches.push(fx);
      });

      // 3. Sort Leagues by Priority
      const sortedIDs = Object.keys(groups).sort((a, b) => {
        const pA = PRIORITY_MAP[a] || DEFAULT_PRIORITY;
        const pB = PRIORITY_MAP[b] || DEFAULT_PRIORITY;

        // If priorities are different, lower number wins
        if (pA !== pB) return pA - pB;

        // If priorities are same (e.g. both are "Others"), sort by name
        const nameA = groups[a].league?.name || "";
        const nameB = groups[b].league?.name || "";
        return nameA.localeCompare(nameB);
      });

      // 4. Render HTML
      sortedIDs.forEach((lid) => {
        const group = groups[lid];
        const $leagueGroup = $('<div class="ss-premium-league-group"></div>');

        // Header
        $leagueGroup.append(`
                    <div class="ss-premium-league-header">
                        <img class="ss-premium-league-logo" src="${
                          group.league?.image_path || ""
                        }" onerror="this.style.display='none'">
                        <div class="ss-premium-league-info">
                            <span class="ss-premium-league-name">${
                              group.league?.name
                            }</span>
                            <span class="ss-premium-league-country">${
                              group.league?.country?.name || ""
                            }</span>
                        </div>
                    </div>
                `);

        // Matches
        group.matches.forEach((fx) => {
          const home = this.getTeam(fx, "home");
          const away = this.getTeam(fx, "away");
          const score = this.getScore(fx);
          const status = this.getStatus(fx);

          const $match = $(`
                        <div class="ss-premium-match">
                            <div class="ss-pm-status ${status.class}">${
            status.text
          }</div>
                            
                            <div class="ss-pm-team home">
                                <span class="ss-pm-team-name">${
                                  home?.name || "-"
                                }</span>
                                <img class="ss-pm-team-logo" src="${
                                  home?.image_path || ""
                                }" onerror="this.style.display='none'">
                            </div>

                            <div class="ss-pm-score-box ${
                              status.class === "live" ? "live" : ""
                            }">
                                <span>${score.home}</span>
                                <span style="font-size:12px; opacity:0.5">:</span>
                                <span>${score.away}</span>
                            </div>

                            <div class="ss-pm-team away">
                                <img class="ss-pm-team-logo" src="${
                                  away?.image_path || ""
                                }" onerror="this.style.display='none'">
                                <span class="ss-pm-team-name">${
                                  away?.name || "-"
                                }</span>
                            </div>

                            <div class="ss-pm-tv">
                                ${
                                  status.class === "live"
                                    ? '<span class="ss-live-dot"></span>'
                                    : '<i class="eicon-arrow-right" style="color:#cbd5e1"></i>'
                                }
                            </div>
                        </div>
                    `);

          $leagueGroup.append($match);
        });

        $wrapper.append($leagueGroup);
      });
    }

    // --- Helpers ---

    getTeam(fx, loc) {
      return fx.participants?.find((p) => p.meta?.location === loc);
    }

    isLive(fx) {
      const s = fx.state?.short_name || "";
      return ["LIVE", "HT", "ET", "PEN_LIVE", "1ST_HALF", "2ND_HALF"].includes(
        s
      );
    }

    getScore(fx) {
      const scores = fx.scores || [];
      // Try to find CURRENT score
      let s =
        scores.find((x) => x.description === "CURRENT") ||
        scores[scores.length - 1];
      if (s && s.score) {
        return {
          home: s.score.home ?? s.score.home_score ?? 0,
          away: s.score.away ?? s.score.away_score ?? 0,
        };
      }
      return { home: "-", away: "-" };
    }

    getStatus(fx) {
      const s = fx.state?.short_name;
      const min = fx.state?.minute;

      if (this.isLive(fx)) {
        return { text: min ? min + "'" : "LIVE", class: "live" };
      }
      if (["FT", "AET", "FT_PEN", "FINISHED"].includes(s)) {
        return { text: "FT", class: "finished" };
      }
      if (["NS", "TBA"].includes(s)) {
        // Parse time
        const d = new Date(fx.starting_at);
        const h = String(d.getHours()).padStart(2, "0");
        const m = String(d.getMinutes()).padStart(2, "0");
        return { text: `${h}:${m}`, class: "upcoming" };
      }
      return { text: s, class: "" };
    }
  }

  // Initialize Widget
  $(document).ready(function () {
    $(".ss-todays-matches-premium").each(function () {
      new TodaysMatches(this);
    });
  });
})(jQuery);
