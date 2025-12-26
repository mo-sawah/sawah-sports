/**
 * Sawah Sports - MOBILE ONLY Widget
 * Vertical layout matching Arabic design
 * v1.0 - Standalone Mobile Widget
 */
(function ($) {
  "use strict";

  const PRIORITY_MAP = {
    253: 1,
    259: 2,
    3214: 3,
    2: 10,
    5: 11,
    8: 20,
    24: 21,
    23: 22,
    564: 30,
    301: 40,
    82: 40,
    384: 40,
    325: 50,
    331: 51,
  };

  const DEFAULT_PRIORITY = 999;

  class MobileTodaysMatches {
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
      this.$el.find(".ssm-filter-btn").on("click", (e) => {
        const $btn = $(e.currentTarget);
        this.$el.find(".ssm-filter-btn").removeClass("active");
        $btn.addClass("active");
        this.state.filter = $btn.data("filter");
        this.renderMatches();
      });

      this.$el.find(".ssm-match-search").on("keyup", (e) => {
        this.state.search = e.target.value.toLowerCase();
        this.renderMatches();
      });

      this.$el.find(".ssm-prev").on("click", () => this.changeDate(-1));
      this.$el.find(".ssm-next").on("click", () => this.changeDate(1));

      this.$el.find(".ssm-date-input").on("change", (e) => {
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
      const $slider = this.$el.find(".ssm-date-slider");
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
          <div class="ssm-date-item ${isSelected ? "active" : ""}">
            <span class="ssm-date-day">${dayName}</span>
            <span class="ssm-date-num">${dayNum}</span>
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
      const $wrapper = this.$el.find(".ssm-matches-wrapper");
      $wrapper.html(
        '<div class="ssm-loading"><div class="ssm-spinner"></div></div>'
      );

      try {
        const dateStr = this.state.date.toISOString().split("T")[0];
        const url = `${SawahSports.restUrl}/fixtures?date=${dateStr}`;

        const res = await $.ajax({
          url: url,
          headers: { "X-WP-Nonce": SawahSports.nonce },
        });

        let rawData = [];
        if (Array.isArray(res)) {
          rawData = res;
        } else if (res && Array.isArray(res.data)) {
          rawData = res.data;
        } else if (res && res.data && Array.isArray(res.data.data)) {
          rawData = res.data.data;
        }

        this.state.fixtures = rawData;

        const liveCount = this.state.fixtures.filter((f) =>
          this.isLive(f)
        ).length;
        this.$el.find(".ssm-live-count").text(`(${liveCount})`);

        this.renderMatches();
      } catch (err) {
        console.error("Mobile Widget Error:", err);
        $wrapper.html('<div class="ssm-empty">Unable to load matches.</div>');
      }
    }

    renderMatches() {
      const $wrapper = this.$el.find(".ssm-matches-wrapper");
      $wrapper.empty();

      if (!Array.isArray(this.state.fixtures)) {
        $wrapper.html('<div class="ssm-empty">No data available.</div>');
        return;
      }

      // Filter
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
        $wrapper.html('<div class="ssm-empty">No matches found.</div>');
        return;
      }

      // Group by League
      const groups = {};
      filtered.forEach((fx) => {
        const lid = fx.league?.id || 0;
        if (!groups[lid]) {
          groups[lid] = { league: fx.league, matches: [] };
        }
        groups[lid].matches.push(fx);
      });

      // Sort Leagues
      const sortedIDs = Object.keys(groups).sort((a, b) => {
        const pA = PRIORITY_MAP[a] || DEFAULT_PRIORITY;
        const pB = PRIORITY_MAP[b] || DEFAULT_PRIORITY;
        if (pA !== pB) return pA - pB;
        const nameA = groups[a].league?.name || "";
        const nameB = groups[b].league?.name || "";
        return nameA.localeCompare(nameB);
      });

      // Render
      sortedIDs.forEach((lid) => {
        const group = groups[lid];
        const $leagueGroup = $('<div class="ssm-league-group"></div>');

        $leagueGroup.append(`
          <div class="ssm-league-header">
            <img class="ssm-league-logo" src="${
              group.league?.image_path || ""
            }" onerror="this.style.display='none'">
            <div class="ssm-league-info">
              <span class="ssm-league-name">${
                group.league?.name || "Unknown"
              }</span>
              <span class="ssm-league-country">${
                group.league?.country?.name || ""
              }</span>
            </div>
          </div>
        `);

        group.matches.forEach((fx) => {
          const $match = this.renderMatch(fx);
          $leagueGroup.append($match);
        });

        $wrapper.append($leagueGroup);
      });
    }

    renderMatch(fx) {
      const home = this.getTeam(fx, "home");
      const away = this.getTeam(fx, "away");
      const score = this.getScore(fx);
      const status = this.getStatus(fx);
      const channels = this.getTVChannels(fx);

      // Determine if live (yellow box)
      const isLive = status.class === "live";
      const isFinished = status.class === "finished";
      const isUpcoming = status.class === "upcoming";

      const $match = $('<div class="ssm-match"></div>');

      // Teams (right side)
      const $teams = $(`
        <div class="ssm-teams">
          <div class="ssm-team-row">
            <span class="ssm-team-name">${home?.name || "-"}</span>
            <img class="ssm-team-logo" src="${
              home?.image_path || ""
            }" onerror="this.style.display='none'">
          </div>
          <div class="ssm-team-row">
            <span class="ssm-team-name">${away?.name || "-"}</span>
            <img class="ssm-team-logo" src="${
              away?.image_path || ""
            }" onerror="this.style.display='none'">
          </div>
        </div>
      `);

      // Score (left side) - YELLOW ONLY FOR LIVE
      const scoreClass = isLive ? "ssm-score live" : "ssm-score";
      const $score = $(`
        <div class="${scoreClass}">
          <div class="ssm-score-num">${score.home}</div>
          <div class="ssm-score-num">${score.away}</div>
        </div>
      `);

      $match.append($teams).append($score);

      // Status/Time below
      if (isFinished) {
        $match.append(`<div class="ssm-status finished">${status.text}</div>`);
      } else if (isUpcoming) {
        $match.append(`<div class="ssm-status upcoming">${status.text}</div>`);
      }

      // Watch link
      if (channels && channels.length > 0) {
        const firstChannel = channels[0];
        const logo = firstChannel.image
          ? `<img src="${firstChannel.image}" class="ssm-channel-logo">`
          : "";

        $match.append(`
          <a href="#" class="ssm-watch-link">
            Watch Live →
            ${logo}
          </a>
        `);
      }

      return $match;
    }

    getTeam(fx, loc) {
      return fx.participants?.find((p) => p.meta?.location === loc);
    }

    isLive(fx) {
      const s = fx.state?.short_name || "";
      return ["LIVE", "HT", "ET", "PEN_LIVE", "1ST_HALF", "2ND_HALF"].includes(
        s
      );
    }

    getTVChannels(fx) {
      const tvstations = fx.tvstations || [];
      const channels = [];
      if (Array.isArray(tvstations)) {
        tvstations.forEach((tv) => {
          const station = tv.tvstation || tv;
          if (station && station.name) {
            channels.push({
              name: station.name,
              image: station.image_path || station.logo_path || null,
            });
          }
        });
      }
      return channels;
    }

    getScore(fx) {
      const state = fx.state?.short_name || "";

      // Upcoming - return dashes
      if (
        ["NS", "TBA", "INT", "POST", "CANCL", "POSTP", "DELAYED"].includes(
          state
        )
      ) {
        return { home: "-", away: "-" };
      }

      const scores = fx.scores || [];
      if (!scores.length) return { home: "-", away: "-" };

      const priorities = [
        "CURRENT",
        "FT_SCORE",
        "FULLTIME",
        "FINAL",
        "EXTRA_TIME",
        "AET",
        "2ND_HALF",
        "HALFTIME",
        "HT_SCORE",
        "1ST_HALF",
      ];

      let scoreObj = null;
      for (const priority of priorities) {
        scoreObj = scores.find((s) => {
          const desc = (s.description || "").toUpperCase();
          return desc === priority || desc.includes(priority);
        });
        if (scoreObj && scoreObj.score) break;
      }

      if (!scoreObj) scoreObj = scores[0];

      if (scoreObj && scoreObj.score) {
        const scoreData = scoreObj.score;
        const home =
          scoreData.home ?? scoreData.home_score ?? scoreData.goals?.home ?? 0;
        const away =
          scoreData.away ?? scoreData.away_score ?? scoreData.goals?.away ?? 0;
        return { home, away };
      }

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

  // Initialize mobile widget
  $(document).ready(function () {
    $(".ss-mobile-matches").each(function () {
      new MobileTodaysMatches(this);
    });
  });
})(jQuery);
