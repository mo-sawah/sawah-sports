/**
 * Sawah Sports - MOBILE ONLY Widget
 * v1.4 - Fixed layout + DEBUG live scores
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
  const DEBUG = true; // Enable debug logging

  class MobileTodaysMatches {
    constructor(container) {
      this.$el = $(container);
      this.state = {
        date: new Date(),
        fixtures: [],
        filter: "all",
        search: "",
      };

      // Auto-refresh for live matches (today only)
      this.refreshTimer = null;

      this.init();
    }

    init() {
      this.renderDateSlider();
      this.bindEvents();
      this.loadData();
      this.createModal();
    }

    createModal() {
      if (!$("#ssm-channels-modal").length) {
        const modalHTML = `
          <div id="ssm-channels-modal" class="ssm-modal">
            <div class="ssm-modal-overlay"></div>
            <div class="ssm-modal-content">
              <div class="ssm-modal-header">
                <h3>Watch Live</h3>
                <button class="ssm-modal-close">&times;</button>
              </div>
              <div class="ssm-modal-body"></div>
            </div>
          </div>
        `;
        $("body").append(modalHTML);

        $(document).on(
          "click",
          ".ssm-modal-close, .ssm-modal-overlay",
          function () {
            $("#ssm-channels-modal").removeClass("show");
          }
        );
      }
    }

    showChannelsModal(channels) {
      const $modal = $("#ssm-channels-modal");
      const $body = $modal.find(".ssm-modal-body");

      $body.empty();

      if (!channels || channels.length === 0) {
        $body.html(
          '<p class="ssm-no-channels">No streaming channels available</p>'
        );
      } else {
        channels.forEach((ch) => {
          const logo = ch.image
            ? `<img src="${ch.image}" class="ssm-modal-channel-logo">`
            : '<div class="ssm-modal-channel-icon">📺</div>';

          const url = ch.url || this.getChannelSearchUrl(ch.name);

          const $channel = $(`
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="ssm-modal-channel">
              ${logo}
              <span class="ssm-modal-channel-name">${ch.name}</span>
              <i class="eicon-export"></i>
            </a>
          `);

          $body.append($channel);
        });
      }

      $modal.addClass("show");
    }

    isTodaySelected() {
      const selected = new Date(this.state.date);
      const today = new Date();
      return selected.toDateString() === today.toDateString();
    }

    setupAutoRefresh() {
      const hasLive = Array.isArray(this.state.fixtures)
        ? this.state.fixtures.some((f) => this.isLive(f))
        : false;

      if (this.isTodaySelected() && hasLive) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    }

    startAutoRefresh() {
      if (this.refreshTimer) return;

      this.refreshTimer = setInterval(() => {
        this.refreshDataSilently();
      }, 30000);
    }

    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    }

    async refreshDataSilently() {
      try {
        const dateStr = this.state.date.toISOString().split("T")[0];
        const url = `${SawahSports.restUrl}/fixtures?date=${dateStr}&nocache=1`;

        const res = await $.ajax({
          url: url,
          headers: { "X-WP-Nonce": SawahSports.nonce },
        });

        let rawData = [];
        if (Array.isArray(res)) rawData = res;
        else if (res && Array.isArray(res.data)) rawData = res.data;
        else if (res && res.data && Array.isArray(res.data.data))
          rawData = res.data.data;

        this.state.fixtures = rawData;

        const liveCount = this.state.fixtures.filter((f) =>
          this.isLive(f)
        ).length;
        this.$el.find(".ssm-live-count").text(`(${liveCount})`);

        this.renderMatches();
        this.setupAutoRefresh();
      } catch (e) {
        if (DEBUG) console.warn("Mobile silent refresh failed:", e);
      }
    }

    getLiveMinute(fx) {
      const candidates = [
        fx.state?.minute,
        fx.state?.current_minute,
        fx.time?.minute,
        fx.time?.minutes,
        fx.time?.added_time,
        fx.periods?.[0]?.minute,
        fx.periods?.[0]?.minutes,
      ];

      for (const c of candidates) {
        const n = Number(c);
        if (Number.isFinite(n) && n > 0) return n;
      }

      const s = fx.state?.short_name || "";
      if (
        fx.starting_at &&
        ["LIVE", "1ST_HALF", "2ND_HALF", "ET", "PEN_LIVE", "HT"].includes(s)
      ) {
        const start = new Date(fx.starting_at).getTime();
        const now = Date.now();
        if (Number.isFinite(start) && start > 0) {
          const mins = Math.floor((now - start) / 60000);
          if (mins > 0 && mins < 200) return mins;
        }
      }

      return null;
    }

    extractGoalsFromScoreItem(item) {
      const s = item?.score;

      if (typeof s === "number") return s;

      const directCandidates = [
        s?.goals,
        s?.goal,
        s?.score,
        s?.value,
        item?.goals,
        item?.score,
        item?.value,
      ];

      for (const c of directCandidates) {
        if (typeof c === "number") return c;
        if (typeof c === "string" && c.trim() !== "" && !isNaN(Number(c)))
          return Number(c);
      }

      if (s && typeof s === "object") {
        if (typeof s.goals === "number") return s.goals;
        if (typeof s.home === "number" || typeof s.away === "number")
          return null;
        if (
          typeof s.home_score === "number" ||
          typeof s.away_score === "number"
        )
          return null;
      }

      return null;
    }

    computeScoreFromItems(items, fx) {
      if (!Array.isArray(items) || items.length === 0) return null;

      const bothSides = items.find((it) => {
        const sc = it?.score;
        return (
          sc &&
          (sc.home !== undefined ||
            sc.away !== undefined ||
            sc.home_score !== undefined ||
            sc.away_score !== undefined ||
            (sc.goals && typeof sc.goals === "object"))
        );
      });

      if (bothSides && bothSides.score) {
        const sc = bothSides.score;
        const home =
          sc.home ??
          sc.home_score ??
          sc.goals?.home ??
          sc.participant?.home ??
          0;

        const away =
          sc.away ??
          sc.away_score ??
          sc.goals?.away ??
          sc.participant?.away ??
          0;

        return { home, away };
      }

      const homeId = this.getTeam(fx, "home")?.id;
      const awayId = this.getTeam(fx, "away")?.id;

      let home = null;
      let away = null;

      items.forEach((it) => {
        const goals = this.extractGoalsFromScoreItem(it);
        if (goals === null) return;

        const pid =
          it.participant_id ??
          it.participant?.id ??
          it.score?.participant_id ??
          it.score?.participant?.id ??
          null;

        const side =
          it.score?.participant === "home" || it.participant === "home"
            ? "home"
            : it.score?.participant === "away" || it.participant === "away"
            ? "away"
            : null;

        if (pid && homeId && pid === homeId) home = goals;
        else if (pid && awayId && pid === awayId) away = goals;
        else if (side === "home") home = goals;
        else if (side === "away") away = goals;
      });

      if (home === null && away === null) return null;

      return { home: home ?? 0, away: away ?? 0 };
    }

    getChannelSearchUrl(channelName) {
      const query = encodeURIComponent(
        `${channelName} live stream watch online`
      );
      return `https://www.google.com/search?q=${query}`;
    }

    bindEvents() {
      this.$el.find(".ssm-filter-btn").on("click", (e) => {
        const $btn = $(e.currentTarget);
        this.$el.find(".ssm-filter-btn").removeClass("active");
        $btn.addClass("active");
        this.state.filter = $btn.data("filter");
        this.renderMatches();
        this.setupAutoRefresh();
      });

      this.$el.find(".ssm-match-search").on("keyup", (e) => {
        this.state.search = e.target.value.toLowerCase();
        this.renderMatches();
        this.setupAutoRefresh();
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

      $(document).on("click", ".ssm-watch-link", (e) => {
        e.preventDefault();
        const channels = $(e.currentTarget).data("channels");
        this.showChannelsModal(channels);
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

        if (DEBUG)
          console.log(
            "Mobile: Loaded fixtures:",
            rawData.length,
            "Live:",
            liveCount
          );

        this.renderMatches();
        this.setupAutoRefresh();
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

      const groups = {};
      filtered.forEach((fx) => {
        const lid = fx.league?.id || 0;
        if (!groups[lid]) {
          groups[lid] = { league: fx.league, matches: [] };
        }
        groups[lid].matches.push(fx);
      });

      const sortedIDs = Object.keys(groups).sort((a, b) => {
        const pA = PRIORITY_MAP[a] || DEFAULT_PRIORITY;
        const pB = PRIORITY_MAP[b] || DEFAULT_PRIORITY;
        if (pA !== pB) return pA - pB;
        const nameA = groups[a].league?.name || "";
        const nameB = groups[b].league?.name || "";
        return nameA.localeCompare(nameB);
      });

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

      const isLive = status.class === "live";
      const isFinished = status.class === "finished";
      const isUpcoming = status.class === "upcoming";

      if (DEBUG && isLive) {
        console.log(
          "Mobile LIVE match:",
          home?.name,
          "vs",
          away?.name,
          "Score:",
          score,
          "Status:",
          status
        );
      }

      const $match = $('<div class="ssm-match"></div>');

      // Row 1, Col 1: Teams
      const $teams = $(`
        <div class="ssm-teams">
          <div class="ssm-team-row">
            <img class="ssm-team-logo" src="${
              home?.image_path || ""
            }" onerror="this.style.display='none'">
            <span class="ssm-team-name">${home?.name || "-"}</span>
          </div>
          <div class="ssm-team-row">
            <img class="ssm-team-logo" src="${
              away?.image_path || ""
            }" onerror="this.style.display='none'">
            <span class="ssm-team-name">${away?.name || "-"}</span>
          </div>
        </div>
      `);

      // Row 1, Col 2: Score (vertical with separator)
      const scoreClass = isLive
        ? "ssm-score live"
        : isFinished
        ? "ssm-score finished"
        : "ssm-score";
      const $scoreCol = $('<div class="ssm-score-column"></div>');

      $scoreCol.append(`
        <div class="${scoreClass}">
          <div class="ssm-score-num">${score.home}</div>
          <div class="ssm-score-separator"></div>
          <div class="ssm-score-num">${score.away}</div>
        </div>
      `);

      $match.append($teams).append($scoreCol);

      // Row 2, Col 1: Watch Live
      if (channels && channels.length > 0) {
        const $watchCell = $('<div class="ssm-watch-cell"></div>');
        const $watchLink = $(`
          <a href="#" class="ssm-watch-link">
            <i class="eicon-play"></i>
            Watch Live
            <i class="eicon-arrow-right"></i>
          </a>
        `);
        $watchLink.data("channels", channels);
        $watchCell.append($watchLink);
        $match.append($watchCell);
      } else {
        $match.append('<div class="ssm-watch-cell"></div>'); // Empty cell
      }

      // Row 2, Col 2: FT/Status
      const $statusCell = $('<div class="ssm-status-cell"></div>');

      if (isLive) {
        $statusCell.append(
          `<span class="ssm-status live">${status.text}</span>`
        );
      } else if (isFinished) {
        $statusCell.append(`<span class="ssm-status finished">FT</span>`);
      } else if (isUpcoming) {
        $statusCell.append(
          `<span class="ssm-status upcoming">${status.text}</span>`
        );
      }

      $match.append($statusCell);

      return $match;
    }

    getTeam(fx, loc) {
      return fx.participants?.find((p) => p.meta?.location === loc);
    }

    isLive(fx) {
      const s = fx.state?.short_name || "";
      const isLiveMatch = [
        "LIVE",
        "HT",
        "ET",
        "PEN_LIVE",
        "1ST_HALF",
        "2ND_HALF",
      ].includes(s);

      if (DEBUG && isLiveMatch) {
        console.log("Mobile: Live match detected -", s, fx);
      }

      return isLiveMatch;
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
      if (!scores.length) {
        if (DEBUG) console.warn("Mobile: No scores array found");
        return { home: "-", away: "-" };
      }

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

      for (const priority of priorities) {
        const items = scores.filter((s) => {
          const desc = (s.description || "").toUpperCase();
          return desc === priority || desc.includes(priority);
        });

        const computed = this.computeScoreFromItems(items, fx);
        if (computed) return computed;
      }

      const nonEmpty = scores.filter((s) => s && s.score);
      if (nonEmpty.length) {
        const last = nonEmpty[nonEmpty.length - 1];
        const lastDesc = (last.description || "").toUpperCase();
        const items = scores.filter(
          (s) => (s.description || "").toUpperCase() === lastDesc
        );
        const computed = this.computeScoreFromItems(items, fx);
        if (computed) return computed;
      }

      return { home: "-", away: "-" };
    }

    getStatus(fx) {
      const s = fx.state?.short_name || "";
      const min = this.getLiveMinute(fx);

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
    $(".ss-mobile-matches").each(function () {
      new MobileTodaysMatches(this);
    });
  });
})(jQuery);
