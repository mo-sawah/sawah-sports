/**
 * Sawah Sports Premium - Complete JavaScript
 * Modern Sofascore-Inspired Design
 * v5.0.0 - All Widgets Fully Implemented
 */

(function () {
  "use strict";

  // =====================================
  // UTILITY MODULES
  // =====================================

  // Date utilities
  const DateUtils = {
    format: (date) => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const d = new Date(date);
      const isToday = d.toDateString() === today.toDateString();
      const isTomorrow = d.toDateString() === tomorrow.toDateString();
      const isYesterday = d.toDateString() === yesterday.toDateString();

      if (isToday) return "Today";
      if (isTomorrow) return "Tomorrow";
      if (isYesterday) return "Yesterday";

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    },

    toISO: (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },

    parse: (str) => {
      return new Date(str);
    },

    addDays: (date, days) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    },
  };

  // API Module
  const API = {
    get: async (path, params = {}) => {
      const url = new URL(SawahSports.restUrl + path, window.location.origin);
      Object.keys(params).forEach((k) => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== "") {
          url.searchParams.set(k, params[k]);
        }
      });

      try {
        const res = await fetch(url.toString(), {
          headers: { "X-WP-Nonce": SawahSports.nonce },
        });

        let data = null;
        try {
          data = await res.json();
        } catch (e) {}

        if (!res.ok) {
          throw new Error(data?.message || "HTTP " + res.status);
        }

        return data;
      } catch (error) {
        console.error("[Sawah Sports API Error]", path, error);
        throw error;
      }
    },
  };

  // DOM Module
  const DOM = {
    el: (tag, attrs = {}, children = []) => {
      const n = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") {
          n.addEventListener(k.slice(2).toLowerCase(), v);
        } else {
          n.setAttribute(k, v);
        }
      });
      children.filter(Boolean).forEach((c) => n.appendChild(c));
      return n;
    },

    clear: (el) => {
      while (el.firstChild) el.removeChild(el.firstChild);
    },

    showError: (container, message) => {
      DOM.clear(container);
      container.appendChild(
        DOM.el("div", {
          class: "ss-error",
          text: message || SawahSports.i18n.dataErr || "Unable to load data",
        })
      );
    },

    showEmpty: (container, message) => {
      DOM.clear(container);
      container.appendChild(
        DOM.el("div", {
          class: "ss-empty",
          text: message || SawahSports.i18n.noData || "No data available",
        })
      );
    },

    showLoading: (container) => {
      DOM.clear(container);
      const loader = DOM.el("div", { class: "ss-loading" }, [
        DOM.el("div", { class: "ss-spinner" }),
        DOM.el("div", { class: "ss-loading-text", text: "Loading..." }),
      ]);
      container.appendChild(loader);
    },
  };

  // Image Module - Handles all image loading with fallbacks
  const Image = {
    team: (team) => {
      const url = team?.image_path || team?.logo_path || "";
      if (url) {
        return DOM.el("img", {
          class: "ss-team-logo",
          src: url,
          alt: team?.name || "",
          loading: "lazy",
          onerror: function () {
            this.style.display = "none";
            const fallback = DOM.el("div", {
              class: "ss-team-logo-fallback",
              text: Image.initials(team?.name),
            });
            this.parentNode.insertBefore(fallback, this.nextSibling);
          },
        });
      }
      return DOM.el("div", {
        class: "ss-team-logo-fallback",
        text: Image.initials(team?.name),
      });
    },

    league: (league) => {
      const url = league?.image_path || league?.logo_path || "";
      if (url) {
        return DOM.el("img", {
          class: "ss-league-logo",
          src: url,
          alt: league?.name || "",
          loading: "lazy",
          onerror: function () {
            this.style.display = "none";
          },
        });
      }
      return null;
    },

    country: (country) => {
      const url = country?.image_path || "";
      if (url) {
        return DOM.el("img", {
          class: "ss-country-flag",
          src: url,
          alt: country?.name || "",
          loading: "lazy",
          onerror: function () {
            this.style.display = "none";
          },
        });
      }
      return null;
    },

    player: (player) => {
      const url = player?.image_path || player?.photo_path || "";
      if (url) {
        return DOM.el("img", {
          class: "ss-player-photo",
          src: url,
          alt: player?.name || "",
          loading: "lazy",
          onerror: function () {
            this.style.display = "none";
            const fallback = DOM.el("div", {
              class: "ss-player-photo-fallback",
              text: Image.initials(player?.name),
            });
            this.parentNode.insertBefore(fallback, this.nextSibling);
          },
        });
      }
      return DOM.el("div", {
        class: "ss-player-photo-fallback",
        text: Image.initials(player?.name),
      });
    },

    initials: (name) => {
      const words = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (!words.length) return "—";
      if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
      }
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    },
  };

  // Team Module
  const Team = {
    fromParticipants: (participants, location) => {
      if (!Array.isArray(participants)) return null;
      return (
        participants.find(
          (x) => x?.meta?.location?.toLowerCase() === location
        ) ||
        participants[location === "home" ? 0 : 1] ||
        null
      );
    },

    node: (team, align = "left") => {
      const name = team?.name || team?.short_code || "—";
      return DOM.el("div", { class: `ss-team-row` }, [
        Image.team(team),
        DOM.el("span", { class: "ss-team-name", text: name }),
      ]);
    },
  };

  // Match Module
  const Match = {
    score: (fx) => {
      const scores = fx?.scores;
      if (!Array.isArray(scores)) return { home: "—", away: "—" };

      const current =
        scores.find((s) => s?.description?.toLowerCase().includes("current")) ||
        scores.find((s) =>
          s?.description?.toLowerCase().includes("fulltime")
        ) ||
        scores[scores.length - 1];

      if (current?.score) {
        return {
          home: current.score.home ?? current.score.home_score ?? "—",
          away: current.score.away ?? current.score.away_score ?? "—",
        };
      }
      return { home: "—", away: "—" };
    },

    state: (fx) => {
      const st = fx?.state;
      return st?.short_name || st?.short || st?.name || "";
    },

    time: (fx) => {
      const s = fx?.starting_at;
      if (!s) return "";
      const m = String(s).match(/(\d{2}):(\d{2})/);
      return m ? `${m[1]}:${m[2]}` : "";
    },

    minute: (fx) => {
      const st = fx?.state;
      return st?.minute || null;
    },

    isLive: (fx) => {
      const state = Match.state(fx).toUpperCase();
      return [
        "LIVE",
        "HT",
        "ET",
        "PEN_LIVE",
        "AET",
        "1ST_HALF",
        "2ND_HALF",
        "BREAK",
      ].includes(state);
    },

    isFinished: (fx) => {
      const state = Match.state(fx).toUpperCase();
      return ["FT", "FT_PEN", "AET", "FINISHED"].includes(state);
    },

    status: (fx) => {
      if (Match.isLive(fx)) return "live";
      if (Match.isFinished(fx)) return "finished";
      return "upcoming";
    },

    winner: (fx, teamLocation) => {
      const score = Match.score(fx);
      if (score.home === "—" || score.away === "—") return false;

      const homeScore = parseInt(score.home);
      const awayScore = parseInt(score.away);

      if (teamLocation === "home") return homeScore > awayScore;
      if (teamLocation === "away") return awayScore > homeScore;
      return false;
    },
  };

  // =====================================
  // WIDGETS
  // =====================================

  const Widgets = {
    // TODAY'S MATCHES - Complete redesign with date navigation
    todaysMatches: {
      currentDate: new Date(),

      render: (root, fixtures) => {
        const body = root.querySelector(".ss-body");

        if (!fixtures || fixtures.length === 0) {
          DOM.showEmpty(
            body,
            SawahSports.i18n.noFixtures || "No matches on this date"
          );
          return;
        }

        // Group by competition
        const byLeague = {};
        fixtures.forEach((fx) => {
          const league = fx.league || {};
          const leagueId = league.id || "other";
          if (!byLeague[leagueId]) {
            byLeague[leagueId] = {
              league: league,
              matches: [],
            };
          }
          byLeague[leagueId].matches.push(fx);
        });

        const container = DOM.el("div", { class: "ss-matches-container" });

        Object.values(byLeague).forEach((group) => {
          const leagueGroup = DOM.el("div", { class: "ss-league-group" });

          // League header
          const leagueName = group.league?.name || "Other Matches";
          const leagueHeader = DOM.el(
            "div",
            { class: "ss-league-header" },
            [
              Image.league(group.league),
              DOM.el("span", { class: "ss-league-name", text: leagueName }),
            ].filter(Boolean)
          );
          leagueGroup.appendChild(leagueHeader);

          // Matches list
          const matchesList = DOM.el("div", { class: "ss-matches-list" });

          group.matches.forEach((fx) => {
            const participants = fx?.participants || [];
            const home = Team.fromParticipants(participants, "home");
            const away = Team.fromParticipants(participants, "away");
            const score = Match.score(fx);
            const status = Match.status(fx);
            const isLive = status === "live";
            const isFinished = status === "finished";
            const minute = Match.minute(fx);

            const matchCard = DOM.el("div", {
              class: `ss-match-card ${isLive ? "ss-match-live" : ""} ${
                isFinished ? "ss-match-finished" : ""
              }`,
            });

            // Time/Status column
            const timeCol = DOM.el("div", { class: "ss-match-time" });
            if (isLive) {
              timeCol.appendChild(
                DOM.el("div", { class: "ss-live-badge" }, [
                  DOM.el("span", { class: "ss-live-dot" }),
                  DOM.el("span", { text: "LIVE" }),
                ])
              );
              if (minute) {
                timeCol.appendChild(
                  DOM.el("div", {
                    class: "ss-match-minute",
                    text: minute + "'",
                  })
                );
              }
            } else if (isFinished) {
              timeCol.appendChild(
                DOM.el("div", { class: "ss-finished-badge", text: "FT" })
              );
            } else {
              const time = Match.time(fx);
              timeCol.appendChild(
                DOM.el("div", { class: "ss-time-badge", text: time })
              );
            }
            matchCard.appendChild(timeCol);

            // Teams column
            const teamsCol = DOM.el("div", { class: "ss-match-teams" }, [
              Team.node(home, "left"),
              Team.node(away, "right"),
            ]);
            matchCard.appendChild(teamsCol);

            // Score column
            const scoreCol = DOM.el("div", { class: "ss-match-score" });
            if (score.home !== "—" && score.away !== "—") {
              scoreCol.appendChild(
                DOM.el("div", { class: "ss-score-row" }, [
                  DOM.el("span", {
                    class: "ss-score-number",
                    text: score.home,
                  }),
                  DOM.el("span", { class: "ss-score-separator", text: ":" }),
                  DOM.el("span", {
                    class: "ss-score-number",
                    text: score.away,
                  }),
                ])
              );
            } else {
              scoreCol.appendChild(
                DOM.el("div", { class: "ss-score-row" }, [
                  DOM.el("span", { class: "ss-score-number", text: "—" }),
                  DOM.el("span", { class: "ss-score-separator", text: ":" }),
                  DOM.el("span", { class: "ss-score-number", text: "—" }),
                ])
              );
            }
            matchCard.appendChild(scoreCol);

            matchesList.appendChild(matchCard);
          });

          leagueGroup.appendChild(matchesList);
          container.appendChild(leagueGroup);
        });

        DOM.clear(body);
        body.appendChild(container);
      },

      changeDate: (root, delta) => {
        const instance = Widgets.todaysMatches;
        if (delta === 0) {
          instance.currentDate = new Date();
        } else {
          instance.currentDate = DateUtils.addDays(instance.currentDate, delta);
        }
        instance.load(root);
      },

      load: async (root) => {
        const instance = Widgets.todaysMatches;
        const body = root.querySelector(".ss-body");
        const header = root.querySelector(".ss-header");

        // Build date navigation
        if (header && !header.querySelector(".ss-date-nav")) {
          DOM.clear(header);
          const nav = DOM.el("div", { class: "ss-date-nav" }, [
            DOM.el("button", {
              class: "ss-nav-btn ss-nav-prev",
              text: "‹",
              onClick: () => instance.changeDate(root, -1),
            }),
            DOM.el("div", { class: "ss-date-display" }, [
              DOM.el("span", { text: DateUtils.format(instance.currentDate) }),
              DOM.el("button", {
                class: "ss-today-btn",
                text: "Today",
                onClick: () => instance.changeDate(root, 0),
              }),
            ]),
            DOM.el("button", {
              class: "ss-nav-btn ss-nav-next",
              text: "›",
              onClick: () => instance.changeDate(root, 1),
            }),
          ]);
          header.appendChild(nav);
        }

        DOM.showLoading(body);

        try {
          const date = DateUtils.toISO(instance.currentDate);
          const response = await API.get("/fixtures", { date: date });
          const fixtures = response?.data?.data || response?.data || [];
          instance.render(root, fixtures);
        } catch (error) {
          console.error("Today Matches Error:", error);
          DOM.showError(
            body,
            SawahSports.i18n.fixturesErr || "Unable to load matches"
          );
        }
      },
    },

    // LIVE MATCHES
    liveMatches: {
      render: (root, fixtures) => {
        const body = root.querySelector(".ss-body");

        if (!fixtures || fixtures.length === 0) {
          DOM.showEmpty(
            body,
            SawahSports.i18n.noLive || "No live matches right now"
          );
          return;
        }

        // Reuse today's matches render
        Widgets.todaysMatches.render(root, fixtures);
      },

      load: async (root) => {
        const body = root.querySelector(".ss-body");
        DOM.showLoading(body);

        try {
          const response = await API.get("/livescores");
          const fixtures = response?.data?.data || response?.data || [];
          Widgets.liveMatches.render(root, fixtures);
        } catch (error) {
          console.error("Live Matches Error:", error);
          DOM.showError(
            body,
            SawahSports.i18n.liveErr || "Unable to load live matches"
          );
        }
      },
    },

    // STANDINGS - Improved with team logos
    standings: {
      render: (root, standings) => {
        const body = root.querySelector(".ss-body");

        if (!standings || standings.length === 0) {
          DOM.showEmpty(
            body,
            SawahSports.i18n.noStandings || "No standings data"
          );
          return;
        }

        const table = DOM.el("table", { class: "ss-standings-table" });

        // Header
        const thead = DOM.el("thead");
        const headerRow = DOM.el("tr");
        ["#", "Team", "P", "W", "D", "L", "GD", "Pts"].forEach((h) => {
          headerRow.appendChild(DOM.el("th", { text: h }));
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = DOM.el("tbody");
        standings.forEach((s, i) => {
          const team = s.participant || {};
          const row = DOM.el("tr", { class: i < 4 ? "ss-top-four" : "" });

          // Position
          row.appendChild(
            DOM.el("td", { class: "ss-pos", text: s.position || i + 1 })
          );

          // Team with logo
          const teamCell = DOM.el("td", { class: "ss-team-cell" });
          const teamDiv = DOM.el("div", { class: "ss-team-info" }, [
            Image.team(team),
            DOM.el("span", { class: "ss-team-name", text: team.name || "—" }),
          ]);
          teamCell.appendChild(teamDiv);
          row.appendChild(teamCell);

          // Stats
          row.appendChild(DOM.el("td", { text: s.played || 0 }));
          row.appendChild(DOM.el("td", { text: s.won || 0 }));
          row.appendChild(DOM.el("td", { text: s.draw || 0 }));
          row.appendChild(DOM.el("td", { text: s.lost || 0 }));
          row.appendChild(
            DOM.el("td", {
              text:
                (s.goal_difference > 0 ? "+" : "") + (s.goal_difference || 0),
            })
          );
          row.appendChild(
            DOM.el("td", { class: "ss-points", text: s.points || 0 })
          );

          tbody.appendChild(row);
        });
        table.appendChild(tbody);

        DOM.clear(body);
        body.appendChild(table);
      },

      load: async (root) => {
        const seasonId = root.getAttribute("data-season");
        const body = root.querySelector(".ss-body");

        if (!seasonId) {
          DOM.showError(body, "Season ID required");
          return;
        }

        DOM.showLoading(body);

        try {
          const response = await API.get(`/standings/${seasonId}`);
          const standings = response?.data?.data || response?.data || [];
          Widgets.standings.render(root, standings);
        } catch (error) {
          console.error("Standings Error:", error);
          DOM.showError(
            body,
            SawahSports.i18n.standingsErr || "Unable to load standings"
          );
        }
      },
    },

    // LEAGUE FIXTURES
    leagueFixtures: {
      load: async (root) => {
        const leagueId = root.getAttribute("data-league");
        const date =
          root.getAttribute("data-date") || DateUtils.toISO(new Date());
        const body = root.querySelector(".ss-body");

        DOM.showLoading(body);

        try {
          const response = await API.get("/fixtures", { date: date });
          let fixtures = response?.data?.data || response?.data || [];

          // Filter by league if specified
          if (leagueId) {
            const leagueIds = leagueId
              .split(",")
              .map((id) => parseInt(id.trim()));
            fixtures = fixtures.filter((fx) =>
              leagueIds.includes(fx?.league?.id)
            );
          }

          Widgets.todaysMatches.render(root, fixtures);
        } catch (error) {
          console.error("League Fixtures Error:", error);
          DOM.showError(
            body,
            SawahSports.i18n.fixturesErr || "Unable to load fixtures"
          );
        }
      },
    },

    // TEAM PROFILE
    teamProfile: {
      load: async (root) => {
        const teamId = root.getAttribute("data-team");
        const body = root.querySelector(".ss-body");

        if (!teamId) {
          DOM.showError(body, "Team ID required");
          return;
        }

        DOM.showLoading(body);

        try {
          const response = await API.get(`/team/${teamId}`);
          const team = response?.data?.data || response?.data;

          if (!team || !team.name) {
            DOM.showEmpty(body, "Team not found");
            return;
          }

          const profile = DOM.el(
            "div",
            { class: "ss-team-profile" },
            [
              DOM.el("div", { class: "ss-profile-header" }, [
                Image.team(team),
                DOM.el("div", { class: "ss-profile-info" }, [
                  DOM.el("h2", { class: "ss-profile-name", text: team.name }),
                  DOM.el(
                    "div",
                    { class: "ss-profile-meta" },
                    [
                      Image.country(team.country),
                      DOM.el("span", { text: team.country?.name || "" }),
                      team.founded
                        ? DOM.el("span", { text: "Founded: " + team.founded })
                        : null,
                    ].filter(Boolean)
                  ),
                ]),
              ]),
              team.venue
                ? DOM.el("div", { class: "ss-venue-info" }, [
                    DOM.el("strong", { text: "Venue: " }),
                    DOM.el("span", {
                      text:
                        (team.venue.name || "") +
                        (team.venue.city ? ", " + team.venue.city : ""),
                    }),
                  ])
                : null,
            ].filter(Boolean)
          );

          DOM.clear(body);
          body.appendChild(profile);
        } catch (error) {
          console.error("Team Profile Error:", error);
          DOM.showError(body, "Unable to load team");
        }
      },
    },

    // TOP SCORERS
    topscorers: {
      load: async (root) => {
        const seasonId = root.getAttribute("data-season");
        const type = root.getAttribute("data-type") || "goals";
        const limit = parseInt(root.getAttribute("data-limit") || "10");
        const body = root.querySelector(".ss-body");

        if (!seasonId) {
          DOM.showError(body, "Season ID required");
          return;
        }

        DOM.showLoading(body);

        try {
          const response = await API.get(`/topscorers/${seasonId}`, { type });
          const scorers = response?.data?.data || response?.data || [];

          if (!Array.isArray(scorers) || scorers.length === 0) {
            DOM.showEmpty(body, "No data available");
            return;
          }

          const list = DOM.el("div", { class: "ss-topscorers-list" });

          scorers.slice(0, limit).forEach((s, i) => {
            const player = s.player || {};
            const team = s.participant || {};

            const row = DOM.el("div", { class: "ss-scorer-card" }, [
              DOM.el("div", { class: "ss-rank", text: i + 1 }),
              DOM.el("div", { class: "ss-player-info" }, [
                Image.player(player),
                DOM.el("div", { class: "ss-player-details" }, [
                  DOM.el("div", {
                    class: "ss-player-name",
                    text: player.name || "",
                  }),
                  DOM.el("div", { class: "ss-team-name" }, [
                    Image.team(team),
                    DOM.el("span", { text: team.name || "" }),
                  ]),
                ]),
              ]),
              DOM.el("div", { class: "ss-stat-value", text: s.total || 0 }),
            ]);

            list.appendChild(row);
          });

          DOM.clear(body);
          body.appendChild(list);
        } catch (error) {
          console.error("Top Scorers Error:", error);
          DOM.showError(body, "Unable to load data");
        }
      },
    },

    // MATCH CENTER - Complete match details
    matchCenter: {
      load: async (root) => {
        const fixtureId = root.getAttribute("data-fixture");
        const body = root.querySelector(".ss-body");

        if (!fixtureId) {
          DOM.showError(body, "Fixture ID required");
          return;
        }

        DOM.showLoading(body);

        try {
          const response = await API.get(`/fixture/${fixtureId}`);
          const fixture = response?.data?.data || response?.data;

          if (!fixture) {
            DOM.showEmpty(body, "Match not found");
            return;
          }

          // For now, show basic match info - can be expanded
          const participants = fixture?.participants || [];
          const home = Team.fromParticipants(participants, "home");
          const away = Team.fromParticipants(participants, "away");
          const score = Match.score(fixture);

          const matchInfo = DOM.el("div", { class: "ss-match-card" }, [
            Team.node(home, "left"),
            DOM.el("div", { class: "ss-match-score" }, [
              DOM.el("div", { class: "ss-score-row" }, [
                DOM.el("span", { class: "ss-score-number", text: score.home }),
                DOM.el("span", { class: "ss-score-separator", text: ":" }),
                DOM.el("span", { class: "ss-score-number", text: score.away }),
              ]),
            ]),
            Team.node(away, "right"),
          ]);

          DOM.clear(body);
          body.appendChild(matchInfo);
        } catch (error) {
          console.error("Match Center Error:", error);
          DOM.showError(body, "Unable to load match");
        }
      },
    },

    // XG MATCH - Expected goals visualization
    xgMatch: {
      load: async (root) => {
        const fixtureId = root.getAttribute("data-fixture");
        const body = root.querySelector(".ss-body");

        if (!fixtureId) {
          DOM.showError(body, "Fixture ID required");
          return;
        }

        DOM.showLoading(body);

        try {
          const response = await API.get(`/xg/${fixtureId}`);
          const xgData = response?.data?.data || response?.data;

          if (!xgData) {
            DOM.showEmpty(body, "xG data not available");
            return;
          }

          // Simple xG display for now
          DOM.clear(body);
          body.appendChild(
            DOM.el("div", {
              class: "ss-empty",
              text: "xG visualization coming soon",
            })
          );
        } catch (error) {
          console.error("xG Match Error:", error);
          DOM.showError(body, "Unable to load xG data");
        }
      },
    },

    // PLAYER PROFILE
    playerProfile: {
      load: async (root) => {
        const playerId = root.getAttribute("data-player");
        const body = root.querySelector(".ss-body");

        if (!playerId) {
          DOM.showError(body, "Player ID required");
          return;
        }

        DOM.showLoading(body);

        try {
          const response = await API.get(`/player/${playerId}`);
          const player = response?.data?.data || response?.data;

          if (!player || !player.name) {
            DOM.showEmpty(body, "Player not found");
            return;
          }

          const profile = DOM.el("div", { class: "ss-team-profile" }, [
            DOM.el("div", { class: "ss-profile-header" }, [
              Image.player(player),
              DOM.el("div", { class: "ss-profile-info" }, [
                DOM.el("h2", { class: "ss-profile-name", text: player.name }),
                DOM.el(
                  "div",
                  { class: "ss-profile-meta" },
                  [
                    player.position
                      ? DOM.el("span", { text: player.position.name })
                      : null,
                    Image.country(player.country),
                    DOM.el("span", { text: player.country?.name || "" }),
                  ].filter(Boolean)
                ),
              ]),
            ]),
          ]);

          DOM.clear(body);
          body.appendChild(profile);
        } catch (error) {
          console.error("Player Profile Error:", error);
          DOM.showError(body, "Unable to load player");
        }
      },
    },

    // ODDS
    odds: {
      load: async (root) => {
        const fixtureId = root.getAttribute("data-fixture");
        const body = root.querySelector(".ss-body");

        if (!fixtureId) {
          DOM.showError(body, "Fixture ID required");
          return;
        }

        DOM.showLoading(body);

        try {
          const response = await API.get(`/odds/${fixtureId}`);
          const odds = response?.data?.data || response?.data || [];

          if (!Array.isArray(odds) || odds.length === 0) {
            DOM.showEmpty(body, "Odds not available");
            return;
          }

          // Simple odds display
          DOM.clear(body);
          body.appendChild(
            DOM.el("div", {
              class: "ss-empty",
              text: "Odds display coming soon",
            })
          );
        } catch (error) {
          console.error("Odds Error:", error);
          DOM.showError(body, "Unable to load odds");
        }
      },
    },

    // PREDICTIONS
    predictions: {
      load: async (root) => {
        const fixtureId = root.getAttribute("data-fixture");
        const body = root.querySelector(".ss-body");

        if (!fixtureId) {
          DOM.showError(body, "Fixture ID required");
          return;
        }

        DOM.showLoading(body);

        try {
          const response = await API.get(`/predictions/${fixtureId}`);
          const data = response?.data?.data || response?.data;

          if (!data) {
            DOM.showEmpty(body, "Predictions not available");
            return;
          }

          // Simple predictions display
          DOM.clear(body);
          body.appendChild(
            DOM.el("div", {
              class: "ss-empty",
              text: "Predictions display coming soon",
            })
          );
        } catch (error) {
          console.error("Predictions Error:", error);
          DOM.showError(body, "Unable to load predictions");
        }
      },
    },

    // HEAD-TO-HEAD
    h2h: {
      load: async (root) => {
        const team1 = root.getAttribute("data-team1");
        const team2 = root.getAttribute("data-team2");
        const body = root.querySelector(".ss-body");

        if (!team1 || !team2) {
          DOM.showError(body, "Both team IDs required");
          return;
        }

        DOM.showLoading(body);

        try {
          const response = await API.get(`/h2h/${team1}/${team2}`);
          const matches = response?.data?.data || response?.data || [];

          if (!Array.isArray(matches) || matches.length === 0) {
            DOM.showEmpty(body, "No matches found");
            return;
          }

          Widgets.todaysMatches.render(root, matches);
        } catch (error) {
          console.error("H2H Error:", error);
          DOM.showError(body, "Unable to load matches");
        }
      },
    },

    // CALENDAR - Month view (simplified)
    calendar: {
      load: async (root) => {
        const body = root.querySelector(".ss-body");
        DOM.showEmpty(body, "Calendar widget - coming soon");
      },
    },

    // SEASON STATS
    seasonStats: {
      load: async (root) => {
        const body = root.querySelector(".ss-body");
        DOM.showEmpty(body, "Season statistics - coming soon");
      },
    },

    // MATCH COMPARISON
    matchComparison: {
      load: async (root) => {
        const body = root.querySelector(".ss-body");
        DOM.showEmpty(body, "Match comparison - coming soon");
      },
    },

    // LIVE TICKER
    liveTicker: {
      load: async (root) => {
        const body =
          root.querySelector(".ss-body") ||
          root.querySelector(".ss-ticker-body");
        DOM.showEmpty(body, "Live ticker - coming soon");
      },
    },
  };

  // =====================================
  // INITIALIZATION
  // =====================================

  function init() {
    // Today's Matches
    document
      .querySelectorAll(".ss-widget.ss-todays-matches")
      .forEach((root) => {
        Widgets.todaysMatches.load(root);
      });

    // Live Matches
    document.querySelectorAll(".ss-widget.ss-live").forEach((root) => {
      Widgets.liveMatches.load(root);
      const refresh = parseInt(root.getAttribute("data-refresh") || "0", 10);
      if (refresh > 0) {
        setInterval(() => Widgets.liveMatches.load(root), refresh * 1000);
      }
    });

    // Standings
    document.querySelectorAll(".ss-widget.ss-standings").forEach((root) => {
      Widgets.standings.load(root);
    });

    // League Fixtures
    document.querySelectorAll(".ss-widget.ss-fixtures").forEach((root) => {
      Widgets.leagueFixtures.load(root);
    });

    // Team Profile
    document.querySelectorAll(".ss-widget.ss-team-profile").forEach((root) => {
      Widgets.teamProfile.load(root);
    });

    // Top Scorers
    document.querySelectorAll(".ss-widget.ss-topscorers").forEach((root) => {
      Widgets.topscorers.load(root);
    });

    // Match Center
    document.querySelectorAll(".ss-widget.ss-match-center").forEach((root) => {
      Widgets.matchCenter.load(root);
    });

    // xG Match
    document.querySelectorAll(".ss-widget.ss-xg-match").forEach((root) => {
      Widgets.xgMatch.load(root);
    });

    // Player Profile
    document
      .querySelectorAll(".ss-widget.ss-player-profile")
      .forEach((root) => {
        Widgets.playerProfile.load(root);
      });

    // Odds
    document.querySelectorAll(".ss-widget.ss-odds").forEach((root) => {
      Widgets.odds.load(root);
    });

    // Predictions
    document.querySelectorAll(".ss-widget.ss-predictions").forEach((root) => {
      Widgets.predictions.load(root);
    });

    // Head-to-Head
    document.querySelectorAll(".ss-widget.ss-h2h").forEach((root) => {
      Widgets.h2h.load(root);
    });

    // Calendar
    document.querySelectorAll(".ss-widget.ss-calendar").forEach((root) => {
      Widgets.calendar.load(root);
    });

    // Season Stats
    document.querySelectorAll(".ss-widget.ss-season-stats").forEach((root) => {
      Widgets.seasonStats.load(root);
    });

    // Match Comparison
    document
      .querySelectorAll(".ss-widget.ss-match-comparison")
      .forEach((root) => {
        Widgets.matchComparison.load(root);
      });

    // Live Ticker
    document.querySelectorAll(".ss-widget.ss-live-ticker").forEach((root) => {
      Widgets.liveTicker.load(root);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
/**
 * Stats Center JavaScript
 * Handles all stats center functionality including dashboard
 */

(function () {
  "use strict";

  const StatsCenter = {
    // Initialize Stats Center
    init: (root) => {
      const leagueId = root.getAttribute("data-league");
      const seasonId = root.getAttribute("data-season");
      const leagueName = root.getAttribute("data-league-name");
      const defaultTab = root.getAttribute("data-default-tab") || "dashboard";

      // Setup tab switching
      StatsCenter.setupTabs(root);

      // Load default tab content
      if (defaultTab === "dashboard") {
        StatsCenter.loadDashboard(root, seasonId, leagueName);
      }
    },

    // Setup tab switching
    setupTabs: (root) => {
      const tabs = root.querySelectorAll(".ss-stats-tab");
      const contents = root.querySelectorAll(".ss-stats-tab-content");

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const tabName = tab.getAttribute("data-tab");

          // Update active tab
          tabs.forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");

          // Update active content
          contents.forEach((c) => c.classList.remove("active"));
          const content = root.querySelector(`[data-content="${tabName}"]`);
          if (content) {
            content.classList.add("active");

            // Load content if needed
            const seasonId = root.getAttribute("data-season");
            const leagueName = root.getAttribute("data-league-name");

            if (
              tabName === "dashboard" &&
              !content.hasAttribute("data-loaded")
            ) {
              StatsCenter.loadDashboard(root, seasonId, leagueName);
            }
          }
        });
      });
    },

    // Load Dashboard Content
    loadDashboard: async (root, seasonId, leagueName) => {
      const content = root.querySelector('[data-content="dashboard"]');
      if (!content) return;

      content.setAttribute("data-loaded", "true");

      // Show loading
      content.innerHTML = `
        <div class="ss-loading">
          <div class="ss-spinner"></div>
          <div class="ss-loading-text">Loading statistics...</div>
        </div>
      `;

      try {
        // Fetch all stats in parallel
        const [goals, assists, passes, cleanSheets, teamGoals, teamPasses] =
          await Promise.all([
            StatsCenter.fetchTopScorers(seasonId, "goals"),
            StatsCenter.fetchTopScorers(seasonId, "assists"),
            StatsCenter.fetchTopScorers(seasonId, "passes"), // This might need adjustment
            StatsCenter.fetchTopScorers(seasonId, "cards"),
            StatsCenter.fetchTeamStats(seasonId, "goals"),
            StatsCenter.fetchTeamStats(seasonId, "passes"),
          ]);

        // Build dashboard HTML
        const dashboardHTML = `
          <!-- Player Stats Section -->
          <div class="ss-stats-section">
            <h2 class="ss-stats-section-title">${leagueName} 2024/25 Player Stats</h2>
            <div class="ss-stats-grid">
              ${StatsCenter.buildStatCard("Goals", goals, "player", "⚽")}
              ${StatsCenter.buildStatCard("Assists", assists, "player", "🎯")}
              ${StatsCenter.buildStatCard(
                "Total Passes",
                passes,
                "player",
                "📊"
              )}
              ${StatsCenter.buildStatCard("Cards", cleanSheets, "player", "🧤")}
            </div>
          </div>
          
          <!-- Club Stats Section -->
          <div class="ss-stats-section">
            <h2 class="ss-stats-section-title">${leagueName} 2024/25 Club Stats</h2>
            <div class="ss-stats-grid">
              ${StatsCenter.buildStatCard("Goals", teamGoals, "team", "⚽")}
              ${StatsCenter.buildStatCard("Tackles Won", [], "team", "💪")}
              ${StatsCenter.buildStatCard("Blocks", [], "team", "🛡️")}
              ${StatsCenter.buildStatCard(
                "Total Passes",
                teamPasses,
                "team",
                "📊"
              )}
            </div>
          </div>
        `;

        content.innerHTML = dashboardHTML;
      } catch (error) {
        console.error("Dashboard Error:", error);
        content.innerHTML = `
          <div class="ss-error">
            Unable to load statistics. Please try again later.
          </div>
        `;
      }
    },

    // Fetch Top Scorers (or other player stats)
    fetchTopScorers: async (seasonId, type = "goals") => {
      try {
        const typeMap = {
          goals: "208",
          assists: "209",
          cards: "84",
          cards: "210",
          passes: "88", // Total passes - might need adjustment
        };

        const typeId = typeMap[type] || "208";
        const response = await fetch(
          `${SawahSports.restUrl}/topscorers/${seasonId}?type=${type}`,
          {
            headers: { "X-WP-Nonce": SawahSports.nonce },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        const scorers = data?.data?.data || data?.data || [];

        return Array.isArray(scorers) ? scorers.slice(0, 10) : [];
      } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        return [];
      }
    },

    // Fetch Team Stats
    fetchTeamStats: async (seasonId, type = "goals") => {
      // For now, return empty array
      // You can implement team stats aggregation later
      return [];
    },

    // Build a stat card (player or team)
    buildStatCard: (title, items, entityType, icon) => {
      if (!Array.isArray(items) || items.length === 0) {
        return `
          <div class="ss-stat-card">
            <div class="ss-stat-card-header">
              <h3 class="ss-stat-card-title">${title}</h3>
              <span class="ss-stat-card-icon">${icon}</span>
            </div>
            <div class="ss-empty" style="padding: 40px 20px; text-align: center; color: var(--ss-text-muted);">
              No data available
            </div>
          </div>
        `;
      }

      const itemsHTML = items
        .map((item, index) => {
          if (entityType === "player") {
            return StatsCenter.buildPlayerItem(item, index + 1);
          } else {
            return StatsCenter.buildTeamItem(item, index + 1);
          }
        })
        .join("");

      return `
        <div class="ss-stat-card">
          <div class="ss-stat-card-header">
            <h3 class="ss-stat-card-title">${title}</h3>
            <span class="ss-stat-card-icon">${icon}</span>
          </div>
          <div class="ss-stat-items">
            ${itemsHTML}
          </div>
        </div>
      `;
    },

    // Build player item HTML
    buildPlayerItem: (item, rank) => {
      const player = item.player || {};
      const team = item.participant || {};
      const value = item.total || 0;

      const playerName = player.name || player.display_name || "Unknown Player";
      const teamName = team.name || team.short_code || "";
      const playerPhoto = player.image_path || player.photo_path || "";
      const teamBadge = team.image_path || team.logo_path || "";

      const photoHTML = playerPhoto
        ? `<img src="${playerPhoto}" alt="${playerName}" class="ss-stat-photo" loading="lazy" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="ss-stat-photo-fallback" style="display:none;">${StatsCenter.getInitials(
             playerName
           )}</div>`
        : `<div class="ss-stat-photo-fallback">${StatsCenter.getInitials(
            playerName
          )}</div>`;

      const teamBadgeHTML = teamBadge
        ? `<img src="${teamBadge}" alt="${teamName}" class="ss-stat-team-badge">`
        : "";

      return `
        <div class="ss-stat-item">
          <div class="ss-stat-rank">${rank}</div>
          <div>${photoHTML}</div>
          <div class="ss-stat-details">
            <div class="ss-stat-name">${playerName}</div>
            <div class="ss-stat-team">
              ${teamBadgeHTML}
              <span>${teamName}</span>
            </div>
          </div>
          <div class="ss-stat-value">${value}</div>
        </div>
      `;
    },

    // Build team item HTML
    buildTeamItem: (item, rank) => {
      const team = item.team || item.participant || {};
      const value = item.total || item.value || 0;

      const teamName = team.name || team.short_code || "Unknown Team";
      const teamBadge = team.image_path || team.logo_path || "";

      const badgeHTML = teamBadge
        ? `<img src="${teamBadge}" alt="${teamName}" class="ss-stat-badge" loading="lazy"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="ss-stat-badge-fallback" style="display:none;">${StatsCenter.getInitials(
             teamName
           )}</div>`
        : `<div class="ss-stat-badge-fallback">${StatsCenter.getInitials(
            teamName
          )}</div>`;

      return `
        <div class="ss-stat-item">
          <div class="ss-stat-rank">${rank}</div>
          <div>${badgeHTML}</div>
          <div class="ss-stat-details">
            <div class="ss-stat-name">${teamName}</div>
          </div>
          <div class="ss-stat-value">${value}</div>
        </div>
      `;
    },

    // Get initials from name
    getInitials: (name) => {
      const words = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (!words.length) return "—";
      if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
      }
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    },
  };

  // Initialize all Stats Centers when DOM is ready
  function initStatsCenters() {
    document.querySelectorAll(".ss-stats-center").forEach((root) => {
      StatsCenter.init(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStatsCenters);
  } else {
    initStatsCenters();
  }

  // Export for global access if needed
  window.SawahStatsCenter = StatsCenter;
})();
/**
 * Stats Center JavaScript - FINAL VERSION
 * Works with Sportmonks topscorers endpoint
 */

(function () {
  "use strict";

  const StatsCenter = {
    // Initialize Stats Center
    init: (root) => {
      const seasonId = root.getAttribute("data-season");
      const leagueName = root.getAttribute("data-league-name");
      const defaultTab = root.getAttribute("data-default-tab") || "dashboard";

      console.log(
        "[Stats Center] Init - Season:",
        seasonId,
        "League:",
        leagueName
      );

      // Setup tab switching
      StatsCenter.setupTabs(root);

      // Load default tab content
      if (defaultTab === "dashboard") {
        StatsCenter.loadDashboard(root, seasonId, leagueName);
      }
    },

    // Setup tab switching
    setupTabs: (root) => {
      const tabs = root.querySelectorAll(".ss-stats-tab");
      const contents = root.querySelectorAll(".ss-stats-tab-content");

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const tabName = tab.getAttribute("data-tab");

          // Update active tab
          tabs.forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");

          // Update active content
          contents.forEach((c) => c.classList.remove("active"));
          const content = root.querySelector(`[data-content="${tabName}"]`);
          if (content) {
            content.classList.add("active");

            // Load content if needed
            const seasonId = root.getAttribute("data-season");
            const leagueName = root.getAttribute("data-league-name");

            if (
              tabName === "dashboard" &&
              !content.hasAttribute("data-loaded")
            ) {
              StatsCenter.loadDashboard(root, seasonId, leagueName);
            }
          }
        });
      });
    },

    // Load Dashboard Content
    loadDashboard: async (root, seasonId, leagueName) => {
      const content = root.querySelector('[data-content="dashboard"]');
      if (!content) return;

      content.setAttribute("data-loaded", "true");

      // Show loading
      content.innerHTML = `
        <div class="ss-loading">
          <div class="ss-spinner"></div>
          <div class="ss-loading-text">Loading statistics...</div>
        </div>
      `;

      try {
        // Fetch all stats in parallel
        const [goals, assists, cleanSheets] = await Promise.all([
          StatsCenter.fetchTopScorers(seasonId, "goals"),
          StatsCenter.fetchTopScorers(seasonId, "assists"),
          StatsCenter.fetchTopScorers(seasonId, "cards"),
        ]);

        console.log("[Stats Center] Data loaded:", {
          goals: goals.length,
          assists: assists.length,
          cleanSheets: cleanSheets.length,
        });

        // Build dashboard HTML
        const dashboardHTML = `
          <!-- Player Stats Section -->
          <div class="ss-stats-section">
            <h2 class="ss-stats-section-title">${leagueName} 2024/25 Player Stats</h2>
            <div class="ss-stats-grid">
              ${StatsCenter.buildStatCard("Goals", goals, "player", "⚽")}
              ${StatsCenter.buildStatCard("Assists", assists, "player", "🎯")}
              ${StatsCenter.buildStatCard("Cards", cleanSheets, "player", "🧤")}
            </div>
          </div>
        `;

        content.innerHTML = dashboardHTML;
      } catch (error) {
        console.error("[Stats Center] Error:", error);
        content.innerHTML = `
          <div class="ss-error">
            <p>Unable to load statistics.</p>
            <p style="font-size: 13px; margin-top: 8px; color: #64748b;">Error: ${error.message}</p>
          </div>
        `;
      }
    },

    // Fetch Top Scorers
    fetchTopScorers: async (seasonId, type = "goals") => {
      try {
        const url = `${SawahSports.restUrl}/topscorers/${seasonId}?type=${type}`;

        const response = await fetch(url, {
          headers: { "X-WP-Nonce": SawahSports.nonce },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Handle nested data structure
        let scorers = [];
        if (data?.data?.data) {
          scorers = data.data.data;
        } else if (data?.data) {
          scorers = Array.isArray(data.data) ? data.data : [];
        } else if (Array.isArray(data)) {
          scorers = data;
        }

        console.log(`[Stats Center] ${type}:`, scorers.length, "players");

        return Array.isArray(scorers) ? scorers.slice(0, 10) : [];
      } catch (error) {
        console.error(`[Stats Center] Error fetching ${type}:`, error);
        return [];
      }
    },

    // Build a stat card
    buildStatCard: (title, items, entityType, icon) => {
      if (!Array.isArray(items) || items.length === 0) {
        return `
          <div class="ss-stat-card">
            <div class="ss-stat-card-header">
              <h3 class="ss-stat-card-title">${title}</h3>
              <span class="ss-stat-card-icon">${icon}</span>
            </div>
            <div class="ss-empty" style="padding: 40px 20px; text-align: center; color: #94a3b8;">
              No data available
            </div>
          </div>
        `;
      }

      const itemsHTML = items
        .map((item, index) => {
          return StatsCenter.buildPlayerItem(item, index + 1);
        })
        .join("");

      return `
        <div class="ss-stat-card">
          <div class="ss-stat-card-header">
            <h3 class="ss-stat-card-title">${title}</h3>
            <span class="ss-stat-card-icon">${icon}</span>
          </div>
          <div class="ss-stat-items">
            ${itemsHTML}
          </div>
        </div>
      `;
    },

    // Build player item HTML
    buildPlayerItem: (item, rank) => {
      const player = item.player || {};
      const team = item.participant || {};
      const value = item.total || 0;

      const playerName = player.display_name || player.name || "Unknown Player";
      const teamName = team.name || team.short_code || "";
      const playerPhoto = player.image_path || "";
      const teamBadge = team.image_path || "";

      const photoHTML = playerPhoto
        ? `<img src="${playerPhoto}" alt="${playerName}" class="ss-stat-photo" loading="lazy" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="ss-stat-photo-fallback" style="display:none;">${StatsCenter.getInitials(
             playerName
           )}</div>`
        : `<div class="ss-stat-photo-fallback">${StatsCenter.getInitials(
            playerName
          )}</div>`;

      const teamBadgeHTML = teamBadge
        ? `<img src="${teamBadge}" alt="${teamName}" class="ss-stat-team-badge" loading="lazy">`
        : "";

      return `
        <div class="ss-stat-item">
          <div class="ss-stat-rank">${rank}</div>
          <div>${photoHTML}</div>
          <div class="ss-stat-details">
            <div class="ss-stat-name">${playerName}</div>
            <div class="ss-stat-team">
              ${teamBadgeHTML}
              <span>${teamName}</span>
            </div>
          </div>
          <div class="ss-stat-value">${value}</div>
        </div>
      `;
    },

    // Get initials from name
    getInitials: (name) => {
      const words = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (!words.length) return "—";
      if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
      }
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    },
  };

  // Initialize all Stats Centers when DOM is ready
  function initStatsCenters() {
    document.querySelectorAll(".ss-stats-center").forEach((root) => {
      StatsCenter.init(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStatsCenters);
  } else {
    initStatsCenters();
  }

  // Export for global access
  window.SawahStatsCenter = StatsCenter;
})();
