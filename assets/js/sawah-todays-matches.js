/**
 * Sawah Sports - Responsive with Mobile Detection
 * Desktop: Horizontal | Mobile: Vertical (Correct Arabic Style)
 * v7.0 - Proper Mobile Layout
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
  const DEBUG = false;

  class TodaysMatches {
    constructor(container) {
      this.$el = $(container);
      this.state = {
        date: new Date(),
        fixtures: [],
        filter: "all",
        search: "",
      };
      this.isMobile = window.innerWidth <= 768;

      // Listen for resize
      $(window).on("resize", () => {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        if (wasMobile !== this.isMobile) {
          this.renderMatches(); // Re-render if layout changes
        }
      });

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
        this.$el.find(".ss-live-count").text(`(${liveCount})`);

        this.renderMatches();
      } catch (err) {
        console.error("Sawah Sports Load Error:", err);
        $wrapper.html('<div class="ss-empty">Unable to load matches.</div>');
      }
    }

    renderMatches() {
      const $wrapper = this.$el.find(".ss-matches-list-wrapper");
      $wrapper.empty();

      if (!Array.isArray(this.state.fixtures)) {
        $wrapper.html('<div class="ss-empty">No data available.</div>');
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
        $wrapper.html('<div class="ss-empty">No matches found.</div>');
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
          const $match = this.isMobile
            ? this.renderMatchMobile(fx)
            : this.renderMatchDesktop(fx);
          $leagueGroup.append($match);
        });

        $wrapper.append($leagueGroup);
      });
    }

    // DESKTOP RENDERING - Horizontal
    renderMatchDesktop(fx) {
      const home = this.getTeam(fx, "home");
      const away = this.getTeam(fx, "away");
      const score = this.getScore(fx);
      const status = this.getStatus(fx);
      const channels = this.getTVChannels(fx);

      return $(`
        <div class="ss-premium-match">
          <div class="ss-pm-status ${status.class}">${status.text}</div>
          
          <div class="ss-pm-team home">
            <span class="ss-pm-team-name">${home?.name || "-"}</span>
            <img class="ss-pm-team-logo" src="${
              home?.image_path || ""
            }" onerror="this.style.display='none'">
          </div>

          <div class="ss-pm-score-box ${status.class === "live" ? "live" : ""}">
            <span>${score.home}</span>
            <span style="font-size:12px; opacity:0.5">:</span>
            <span>${score.away}</span>
          </div>

          <div class="ss-pm-team away">
            <img class="ss-pm-team-logo" src="${
              away?.image_path || ""
            }" onerror="this.style.display='none'">
            <span class="ss-pm-team-name">${away?.name || "-"}</span>
          </div>

          <div class="ss-pm-tv">
            ${this.renderTVChannels(channels, status.class, false)}
          </div>
        </div>
      `);
    }

    // MOBILE RENDERING - Vertical (Arabic Style)
    renderMatchMobile(fx) {
      const home = this.getTeam(fx, "home");
      const away = this.getTeam(fx, "away");
      const score = this.getScore(fx);
      const status = this.getStatus(fx);
      const channels = this.getTVChannels(fx);
      const isUpcoming = status.class === "upcoming";
      const isFinished = status.class === "finished";

      return $(`
        <div class="ss-premium-match-mobile">
          <div class="ss-pm-teams-mobile">
            <div class="ss-pm-team-row-mobile">
              <span class="ss-pm-team-name-mobile">${home?.name || "-"}</span>
              <img class="ss-pm-team-logo-mobile" src="${
                home?.image_path || ""
              }" onerror="this.style.display='none'">
            </div>
            <div class="ss-pm-team-row-mobile">
              <span class="ss-pm-team-name-mobile">${away?.name || "-"}</span>
              <img class="ss-pm-team-logo-mobile" src="${
                away?.image_path || ""
              }" onerror="this.style.display='none'">
            </div>
          </div>
          
          <div class="ss-pm-score-mobile ${isUpcoming ? "upcoming" : ""}">
            <div class="ss-pm-score-num-mobile">${score.home}</div>
            <div class="ss-pm-score-num-mobile">${score.away}</div>
          </div>
          
          ${
            isFinished
              ? `<div class="ss-pm-status-mobile">${status.text}</div>`
              : ""
          }
          ${
            isUpcoming
              ? `<div class="ss-pm-time-mobile">${status.text}</div>`
              : ""
          }
          
          ${this.renderTVChannels(channels, status.class, true)}
        </div>
      `);
    }

    renderTVChannels(channels, statusClass, isMobile) {
      if (!channels || channels.length === 0) {
        return statusClass === "live"
          ? '<span class="ss-live-dot"></span>'
          : "";
      }

      const firstChannel = channels[0];
      const channelLogo = firstChannel.image
        ? `<img src="${firstChannel.image}" alt="${firstChannel.name}" style="height:20px; vertical-align:middle; margin-left:6px;">`
        : "";

      if (isMobile) {
        return `
          <a href="#" class="ss-watch-link-mobile">
            شاهد مباشرة على →
            ${channelLogo}
          </a>
        `;
      } else {
        const buttonText = SawahSports.i18n.watch || "Watch";
        return `
          <div class="ss-tv-channels">
            <button class="ss-watch-live-btn" type="button">
              <i class="eicon-play"></i>
              <span>${buttonText}</span>
            </button>
            <div class="ss-channels-dropdown">
              <div class="ss-channels-header">
                ${SawahSports.i18n.availableOn || "Available on"}
              </div>
              ${channels
                .slice(0, 5)
                .map((ch) => {
                  const img = ch.image
                    ? `<img src="${ch.image}" alt="${ch.name}" style="width:28px;height:28px;object-fit:contain;">`
                    : "";
                  return `<a href="#" class="ss-channel-item">${img}<span>${ch.name}</span></a>`;
                })
                .join("")}
            </div>
          </div>
        `;
      }
    }

    // Helpers
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
              id: station.id,
              name: station.name,
              url: station.url || null,
              image: station.image_path || station.logo_path || null,
            });
          }
        });
      }
      return channels;
    }

    getScore(fx) {
      const state = fx.state?.short_name || "";
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

  // Initialize
  $(document).ready(function () {
    $(".ss-todays-matches-premium").each(function () {
      new TodaysMatches(this);
    });

    // Dropdown toggle (desktop only)
    $(document).on("click", ".ss-watch-live-btn", function (e) {
      e.stopPropagation();
      const $dropdown = $(this).siblings(".ss-channels-dropdown");
      $(".ss-channels-dropdown").not($dropdown).removeClass("show");
      $dropdown.toggleClass("show");
    });

    $(document).on("click", function (e) {
      if (!$(e.target).closest(".ss-tv-channels").length) {
        $(".ss-channels-dropdown").removeClass("show");
      }
    });
  });
})(jQuery);
