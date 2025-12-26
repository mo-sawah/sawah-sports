/**
 * Sawah Sports - Premium Today's Matches Widget
 * Features: Date Slider, Priority Sorting, Search, Live Filter
 * v5.2.0 - Enhanced Score Detection & Debugging
 */
(function ($) {
  "use strict";

  // --- CONFIGURATION: LEAGUE PRIORITY ---
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
  const DEBUG = false; // Set to true to enable console logging

  class TodaysMatches {
    constructor(container) {
      this.$el = $(container);
      this.state = {
        date: new Date(),
        fixtures: [],
        filter: "all",
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
      this.$el.find(".ss-filter-btn").on("click", (e) => {
        const $btn = $(e.currentTarget);
        this.$el.find(".ss-filter-btn").removeClass("active");
        $btn.addClass("active");
        this.state.filter = $btn.data("filter");
        this.renderMatches();
      });

      this.$el.find(".ss-match-search").on("keyup", (e) => {
        this.state.search = e.target.value.toLowerCase();
        this.renderMatches();
      });

      this.$el.find(".ss-prev").on("click", () => this.changeDate(-1));
      this.$el.find(".ss-next").on("click", () => this.changeDate(1));

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

      setTimeout(() => {
        if ($slider[0]) {
          const scrollLeft =
            ($slider[0].scrollWidth - $slider[0].clientWidth) / 2;
          $slider.animate({ scrollLeft: scrollLeft }, 300);
        }
      }, 10);
    }

    async loadData() {
      const $wrapper = this.$el.find(".ss-matches-list-wrapper");
      $wrapper.html(
        '<div class="ss-loading"><div class="ss-spinner"></div></div>'
      );

      try {
        const dateStr = this.state.date.toISOString().split("T")[0];
        const url = `${SawahSports.restUrl}/fixtures?date=${dateStr}`;

        if (DEBUG) console.log("Fetching fixtures for:", dateStr);

        const res = await $.ajax({
          url: url,
          headers: { "X-WP-Nonce": SawahSports.nonce },
        });

        if (DEBUG) {
          console.log("API Response:", res);
          console.log("Response type:", typeof res);
          console.log("Is array:", Array.isArray(res));
        }

        // --- ENHANCED DATA EXTRACTION ---
        let rawData = [];

        if (Array.isArray(res)) {
          rawData = res;
        } else if (res && Array.isArray(res.data)) {
          rawData = res.data;
        } else if (res && res.data && Array.isArray(res.data.data)) {
          rawData = res.data.data;
        }

        if (DEBUG) {
          console.log("Extracted fixtures count:", rawData.length);
          if (rawData.length > 0) {
            console.log("Sample fixture:", rawData[0]);
            console.log("Sample scores:", rawData[0].scores);
          }
        }

        this.state.fixtures = rawData;

        // Update Live Count UI
        const liveCount = this.state.fixtures.filter((f) =>
          this.isLive(f)
        ).length;
        this.$el.find(".ss-live-count").text(`(${liveCount})`);

        this.renderMatches();
      } catch (err) {
        console.error("Sawah Sports Load Error:", err);
        $wrapper.html(
          '<div class="ss-empty">Unable to load matches. Check console for details.</div>'
        );
      }
    }

    renderMatches() {
      const $wrapper = this.$el.find(".ss-matches-list-wrapper");
      $wrapper.empty();

      if (!Array.isArray(this.state.fixtures)) {
        $wrapper.html('<div class="ss-empty">No data available.</div>');
        return;
      }

      // 1. Filter Data
      let filtered = this.state.fixtures.filter((fx) => {
        if (this.state.filter === "live" && !this.isLive(fx)) return false;

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

      // 3. Sort Leagues
      const sortedIDs = Object.keys(groups).sort((a, b) => {
        const pA = PRIORITY_MAP[a] || DEFAULT_PRIORITY;
        const pB = PRIORITY_MAP[b] || DEFAULT_PRIORITY;
        if (pA !== pB) return pA - pB;
        const nameA = groups[a].league?.name || "";
        const nameB = groups[b].league?.name || "";
        return nameA.localeCompare(nameB);
      });

      // 4. Render HTML
      sortedIDs.forEach((lid) => {
        const group = groups[lid];
        const $leagueGroup = $('<div class="ss-premium-league-group"></div>');

        $leagueGroup.append(`
                    <div class="ss-premium-league-header">
                        <img class="ss-premium-league-logo" src="${
                          group.league?.image_path || ""
                        }" onerror="this.style.display='none'">
                        <div class="ss-premium-league-info">
                            <span class="ss-premium-league-name">${
                              group.league?.name || "Unknown League"
                            }</span>
                            <span class="ss-premium-league-country">${
                              group.league?.country?.name || ""
                            }</span>
                        </div>
                    </div>
                `);

        group.matches.forEach((fx) => {
          const home = this.getTeam(fx, "home");
          const away = this.getTeam(fx, "away");
          const score = this.getScore(fx);
          const status = this.getStatus(fx);

          if (DEBUG && score.home !== "-" && score.home !== 0) {
            console.log("Match with score:", {
              home: home?.name,
              away: away?.name,
              score: score,
              state: fx.state,
              scores: fx.scores,
            });
          }

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

    /**
     * ENHANCED Score Getter with Multiple Fallbacks
     * Handles various Sportmonks API score formats
     */
    getScore(fx) {
      const state = fx.state?.short_name || "";

      // 1. Not Started?
      if (
        ["NS", "TBA", "INT", "POST", "CANCL", "POSTP", "DELAYED"].includes(
          state
        )
      ) {
        return { home: "-", away: "-" };
      }

      const scores = fx.scores || [];
      if (!scores.length) {
        if (DEBUG) console.log("No scores array for fixture:", fx.id);
        return { home: "-", away: "-" };
      }

      if (DEBUG && fx.id) {
        console.log("Processing scores for fixture:", fx.id, {
          state: state,
          scores: scores,
        });
      }

      // 2. Priority list - Sportmonks uses various descriptions
      const priorities = [
        "CURRENT", // Live/Current score
        "FT_SCORE", // Full-time score
        "FULLTIME", // Full-time (alternative)
        "FINAL", // Final score
        "EXTRA_TIME", // After extra time
        "AET", // After extra time
        "2ND_HALF", // Second half
        "HALFTIME", // Half-time
        "HT_SCORE", // Half-time score
        "1ST_HALF", // First half
      ];

      let scoreObj = null;

      // Try each priority
      for (const priority of priorities) {
        scoreObj = scores.find((s) => {
          const desc = (s.description || "").toUpperCase();
          return desc === priority || desc.includes(priority);
        });

        if (scoreObj && scoreObj.score) {
          const hasValidScore =
            scoreObj.score.home !== undefined ||
            scoreObj.score.home_score !== undefined ||
            scoreObj.score.goals !== undefined ||
            scoreObj.score.participant !== undefined;

          if (hasValidScore) {
            if (DEBUG)
              console.log("Found score with priority:", priority, scoreObj);
            break;
          } else {
            scoreObj = null;
          }
        }
      }

      // 3. Fallback: Get the last non-zero score entry
      if (!scoreObj) {
        const nonZeroScores = scores.filter((s) => {
          if (!s.score) return false;
          const h = s.score.home ?? s.score.home_score ?? s.score.goals ?? 0;
          const a = s.score.away ?? s.score.away_score ?? s.score.goals ?? 0;
          return h > 0 || a > 0;
        });

        if (nonZeroScores.length > 0) {
          scoreObj = nonZeroScores[nonZeroScores.length - 1];
          if (DEBUG) console.log("Using last non-zero score:", scoreObj);
        } else {
          // Last resort: use first score object
          scoreObj = scores[0];
          if (DEBUG) console.log("Using first score object:", scoreObj);
        }
      }

      // 4. Extract values with multiple field name support
      if (scoreObj && scoreObj.score) {
        const scoreData = scoreObj.score;

        // Try various field names that Sportmonks might use
        const home =
          scoreData.home ??
          scoreData.home_score ??
          scoreData.goals?.home ??
          scoreData.participant?.home ??
          (scoreData.participant === "home" ? scoreData.goals : null) ??
          0;

        const away =
          scoreData.away ??
          scoreData.away_score ??
          scoreData.goals?.away ??
          scoreData.participant?.away ??
          (scoreData.participant === "away" ? scoreData.goals : null) ??
          0;

        if (DEBUG) {
          console.log("Extracted score:", {
            home,
            away,
            description: scoreObj.description,
            rawScore: scoreData,
          });
        }

        // For finished matches, don't show 0:0 if it's likely wrong
        if (["FT", "AET", "FT_PEN", "FINISHED"].includes(state)) {
          if (home === 0 && away === 0) {
            if (DEBUG)
              console.warn(
                "Finished match showing 0:0 - this might be incorrect data"
              );
          }
        }

        return { home: home, away: away };
      }

      // 5. Ultimate fallback
      if (DEBUG) console.warn("Could not extract score, using fallback");
      return { home: "-", away: "-" };
    }

    getStatus(fx) {
      const s = fx.state?.short_name || "";
      const min = fx.state?.minute;

      if (this.isLive(fx)) {
        return { text: min ? min + "'" : "LIVE", class: "live" };
      }
      if (["FT", "AET", "FT_PEN", "FINISHED"].includes(s)) {
        return { text: "FT", class: "finished" };
      }
      if (["NS", "TBA", "POST"].includes(s)) {
        const d = new Date(fx.starting_at);
        const h = String(d.getHours()).padStart(2, "0");
        const m = String(d.getMinutes()).padStart(2, "0");
        return { text: `${h}:${m}`, class: "upcoming" };
      }
      return { text: s || "—", class: "" };
    }
  }

  $(document).ready(function () {
    $(".ss-todays-matches-premium").each(function () {
      new TodaysMatches(this);
    });
  });
})(jQuery);
