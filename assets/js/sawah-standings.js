/**
 * Sawah Sports - Premium Standings Widget JavaScript
 * Handles data fetching, tab switching, and table rendering
 */

(function ($) {
  "use strict";

  class SawahStandingsPremium {
    constructor(element) {
      this.$el = $(element);
      this.widgetId = this.$el.attr("id");
      this.seasonId = this.$el.data("season-id");
      this.showForm = this.$el.data("show-form") === "yes";
      this.formCount = parseInt(this.$el.data("form-count")) || 5;
      this.highlightZones = this.$el.data("highlight-zones") === "yes";

      // Parse zone positions
      this.zones = {
        cl: this.parsePositions(this.$el.data("cl-positions")),
        el: this.parsePositions(this.$el.data("el-positions")),
        ecl: this.parsePositions(this.$el.data("ecl-positions")),
        rel: this.parsePositions(this.$el.data("rel-positions")),
      };

      this.currentType = "all";
      this.rawStandingsData = null;
      this.standingsByType = {
        all: [],
        home: [],
        away: [],
      };

      this.init();
    }

    parsePositions(str) {
      if (!str) return [];
      return str
        .toString()
        .split(",")
        .map((p) => parseInt(p.trim()))
        .filter((p) => !isNaN(p));
    }

    init() {
      this.bindEvents();
      this.fetchStandings();
    }

    bindEvents() {
      // Home/Away tab switching
      this.$el.on("click", ".ss-standings-tab", (e) => {
        const $btn = $(e.currentTarget);
        const type = $btn.data("type");

        this.$el.find(".ss-standings-tab").removeClass("active");
        $btn.addClass("active");

        this.currentType = type;
        this.renderTable();
      });

      // Rules toggle
      this.$el.on("click", ".ss-rules-header", (e) => {
        const $header = $(e.currentTarget);
        const $content = $header.next(".ss-rules-content");

        $header.toggleClass("open");
        $content.slideToggle(300);
      });
    }

    fetchStandings() {
      if (!this.seasonId) {
        this.showError("No season ID specified");
        return;
      }

      this.showLoading();

      $.ajax({
        url: SawahSports.restUrl + "/standings/" + this.seasonId,
        method: "GET",
        beforeSend: (xhr) => {
          xhr.setRequestHeader("X-WP-Nonce", SawahSports.nonce);
        },
        success: (response) => {
          console.log("Standings API Response:", response);

          // Handle WordPress REST response wrapper
          let data = response;
          if (response.success !== undefined && response.data) {
            data = response.data;
          }

          // Handle Sportmonks API structure: { data: [...] }
          if (data.data && Array.isArray(data.data)) {
            this.rawStandingsData = data.data; // Store ALL standings
          } else if (Array.isArray(data)) {
            this.rawStandingsData = data;
          } else {
            console.error("Unexpected data structure:", data);
            this.showError("Invalid standings data format");
            return;
          }

          if (!this.rawStandingsData || this.rawStandingsData.length === 0) {
            this.showError("No standings data available for this season");
            return;
          }

          console.log("Parsed standings data:", this.rawStandingsData);

          // Group standings by type (overall, home, away)
          this.standingsByType = {
            all: [],
            home: [],
            away: [],
          };

          this.rawStandingsData.forEach((standing) => {
            const typeName = (
              standing.type_name ||
              standing.type?.name ||
              ""
            ).toLowerCase();

            // Sportmonks usually has separate standing types
            if (typeName.includes("home")) {
              this.standingsByType.home.push(standing);
            } else if (typeName.includes("away")) {
              this.standingsByType.away.push(standing);
            } else {
              // Default to overall/all
              this.standingsByType.all.push(standing);
            }
          });

          // If no home/away specific data, use all for everything
          if (this.standingsByType.all.length === 0) {
            this.standingsByType.all = this.rawStandingsData;
          }
          if (this.standingsByType.home.length === 0) {
            this.standingsByType.home = this.rawStandingsData;
          }
          if (this.standingsByType.away.length === 0) {
            this.standingsByType.away = this.rawStandingsData;
          }

          console.log("Standings by type:", {
            all: this.standingsByType.all.length,
            home: this.standingsByType.home.length,
            away: this.standingsByType.away.length,
          });

          this.renderTable();
        },
        error: (xhr) => {
          console.error("Standings fetch error:", xhr);
          const errorMsg =
            xhr.responseJSON?.message ||
            xhr.statusText ||
            "Failed to load standings";
          this.showError(errorMsg);
        },
      });
    }

    renderTable() {
      console.log("renderTable called for type:", this.currentType);

      if (!this.standingsByType || !this.standingsByType[this.currentType]) {
        console.warn("No standings data for type:", this.currentType);
        this.showEmpty();
        return;
      }

      const standings = this.standingsByType[this.currentType];

      if (!standings || standings.length === 0) {
        console.warn("Empty standings array for type:", this.currentType);
        this.showEmpty();
        return;
      }

      console.log(
        "Building table with",
        standings.length,
        "teams for",
        this.currentType
      );

      const html = this.buildTableHTML(standings);
      this.$el.find(".ss-standings-table-wrapper").html(html);
    }

    buildTableHTML(standings) {
      let html = '<table class="ss-standings-table"><thead><tr>';

      // Headers
      html += "<th>#</th>";
      html += '<th class="ss-team-col">Team</th>';
      html += '<th class="ss-stat-col">P</th>';
      html += '<th class="ss-stat-col">W</th>';
      html += '<th class="ss-stat-col">D</th>';
      html += '<th class="ss-stat-col">L</th>';
      html += '<th class="ss-stat-col">DIFF</th>';
      html += '<th class="ss-goals-col">Goals</th>';

      if (this.showForm) {
        html += '<th class="ss-form-col">L</th>';
      }

      html += '<th class="ss-pts-col">Pts</th>';
      html += "</tr></thead><tbody>";

      // Sort by position
      standings.sort((a, b) => a.position - b.position);

      standings.forEach((teamStanding) => {
        const position = teamStanding.position || 0;
        const zoneClass = this.getZoneClass(position);

        html += "<tr>";

        // Position
        html += '<td><div class="ss-position">';
        html += `<span class="ss-position-badge ${zoneClass}">${position}</span>`;
        html += "</div></td>";

        // Team
        html += '<td><div class="ss-team-cell">';
        if (teamStanding.participant && teamStanding.participant.image_path) {
          html += `<img src="${this.escapeHtml(
            teamStanding.participant.image_path
          )}" alt="" class="ss-team-logo" loading="lazy">`;
        }
        html += `<span class="ss-team-name">${this.escapeHtml(
          teamStanding.participant?.name || "Unknown"
        )}</span>`;
        html += "</div></td>";

        // Stats - extract from details array
        const stats = this.extractStats(teamStanding);
        html += `<td class="ss-stat-col">${stats.played}</td>`;
        html += `<td class="ss-stat-col">${stats.won}</td>`;
        html += `<td class="ss-stat-col">${stats.draw}</td>`;
        html += `<td class="ss-stat-col">${stats.lost}</td>`;

        // Goal Difference
        const diffClass =
          stats.diff > 0 ? "positive" : stats.diff < 0 ? "negative" : "";
        const diffDisplay = stats.diff > 0 ? `+${stats.diff}` : stats.diff;
        html += `<td class="ss-stat-col ss-diff ${diffClass}">${diffDisplay}</td>`;

        // Goals For:Against
        html += `<td class="ss-goals-col">${stats.goalsFor}:${stats.goalsAgainst}</td>`;

        // Form
        if (this.showForm && teamStanding.form) {
          html += '<td class="ss-form-col">';
          html += this.renderForm(teamStanding.form);
          html += "</td>";
        } else if (this.showForm) {
          html += '<td class="ss-form-col">—</td>';
        }

        // Points
        html += `<td class="ss-pts-col">${teamStanding.points || 0}</td>`;

        html += "</tr>";
      });

      html += "</tbody></table>";
      return html;
    }

    extractStats(teamStanding) {
      const stats = {
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        diff: 0,
      };

      if (!teamStanding.details || !Array.isArray(teamStanding.details)) {
        console.warn(
          "No details array for team:",
          teamStanding.participant?.name
        );
        return stats;
      }

      // Log first team's details to see actual field names
      if (teamStanding.position === 1) {
        console.log("First team details for debugging:", teamStanding.details);
      }

      teamStanding.details.forEach((detail) => {
        const typeId = detail.type?.id;
        const typeName = detail.type?.name?.toLowerCase() || "";
        const value = parseInt(detail.value) || 0;

        // Match by type ID (more reliable) or name
        // Common Sportmonks type IDs:
        // 129 = games played, 130 = won, 131 = draw, 132 = lost
        // 133 = goals for, 134 = goals against

        if (
          typeId === 129 ||
          typeName.includes("played") ||
          typeName.includes("games")
        ) {
          stats.played = value;
        } else if (
          typeId === 130 ||
          typeName.includes("won") ||
          typeName.includes("win")
        ) {
          stats.won = value;
        } else if (
          typeId === 131 ||
          typeName.includes("draw") ||
          typeName === "draws"
        ) {
          stats.draw = value;
        } else if (
          typeId === 132 ||
          typeName.includes("lost") ||
          typeName.includes("loss")
        ) {
          stats.lost = value;
        } else if (
          typeId === 133 ||
          typeName.includes("goals_for") ||
          typeName.includes("goalsfor") ||
          typeName === "goals for"
        ) {
          stats.goalsFor = value;
        } else if (
          typeId === 134 ||
          typeName.includes("goals_against") ||
          typeName.includes("goalsagainst") ||
          typeName === "goals against"
        ) {
          stats.goalsAgainst = value;
        }
      });

      stats.diff = stats.goalsFor - stats.goalsAgainst;

      // Log if stats still zero (debugging)
      if (teamStanding.position === 1 && stats.played === 0) {
        console.warn(
          "⚠️ Stats extraction failed for first team. Available type names:",
          teamStanding.details.map((d) => d.type?.name).join(", ")
        );
      }

      return stats;
    }

    renderForm(formData) {
      if (!formData || !Array.isArray(formData) || formData.length === 0) {
        return "—";
      }

      // Debug: Log the FULL form data structure for first team
      if (!window.sawahFormDebugDone) {
        console.log(
          "📊 FULL FORM DATA STRUCTURE:",
          JSON.stringify(formData[0], null, 2)
        );
        console.log("📊 All form objects:", formData);
        window.sawahFormDebugDone = true;
      }

      // Take last N matches and reverse to show most recent first
      const recent = formData.slice(-this.formCount).reverse();

      let html = '<div class="ss-form-badges">';
      let debugInfo = [];

      recent.forEach((match, index) => {
        // Try EVERY possible field that might contain the outcome
        const possibleOutcomes = [
          match.outcome,
          match.result,
          match.status,
          match.result_info,
          match.winner,
          match.participant_result,
          match.team_result,
          match.match_result,
        ];

        // Also check nested objects
        if (match.type) {
          possibleOutcomes.push(match.type.name);
          possibleOutcomes.push(match.type.code);
        }
        if (match.result_type) {
          possibleOutcomes.push(match.result_type.name);
        }

        // Find first non-null value
        let outcome = "";
        for (const val of possibleOutcomes) {
          if (val !== null && val !== undefined && val !== "") {
            outcome = String(val).toLowerCase();
            break;
          }
        }

        debugInfo.push({ index, outcome, allFields: Object.keys(match) });

        let badge = "draw";
        let letter = "D";

        // Check for WIN
        if (
          outcome.includes("win") ||
          outcome.includes("won") ||
          outcome.includes("w") ||
          outcome.includes("victory") ||
          outcome.includes("success")
        ) {
          badge = "win";
          letter = "W";
        }
        // Check for LOSS
        else if (
          outcome.includes("loss") ||
          outcome.includes("lost") ||
          outcome.includes("lose") ||
          outcome.includes("l") ||
          outcome.includes("defeat") ||
          outcome.includes("failed")
        ) {
          badge = "loss";
          letter = "L";
        }
        // Check for DRAW
        else if (
          outcome.includes("draw") ||
          outcome.includes("drew") ||
          outcome.includes("d") ||
          outcome.includes("tie") ||
          outcome.includes("tied")
        ) {
          badge = "draw";
          letter = "D";
        }
        // Last resort: try to parse scores
        else if (match.score || match.scores) {
          const scoreData = match.score || match.scores;
          const home = scoreData.home || scoreData.goals_home || 0;
          const away = scoreData.away || scoreData.goals_away || 0;

          if (home > away) {
            badge = "win";
            letter = "W";
          } else if (home < away) {
            badge = "loss";
            letter = "L";
          } else {
            badge = "draw";
            letter = "D";
          }
        }

        const title = outcome || "No outcome data";
        html += `<span class="ss-form-badge ${badge}" title="${this.escapeHtml(
          title
        )}">${letter}</span>`;
      });
      html += "</div>";

      // Log debugging info once
      if (!window.sawahFormFieldsLogged) {
        console.log("🔍 FORM PARSING DEBUG:", debugInfo);
        console.log(
          "📋 Available fields in form data:",
          debugInfo[0]?.allFields
        );
        window.sawahFormFieldsLogged = true;
      }

      return html;
    }

    getZoneClass(position) {
      if (!this.highlightZones) return "";

      if (this.zones.cl.includes(position)) return "ss-cl";
      if (this.zones.el.includes(position)) return "ss-el";
      if (this.zones.ecl.includes(position)) return "ss-ecl";
      if (this.zones.rel.includes(position)) return "ss-rel";

      return "";
    }

    showLoading() {
      this.$el.find(".ss-standings-table-wrapper").html(`
                <div class="ss-loading">
                    <div class="ss-spinner"></div>
                </div>
            `);
    }

    showEmpty() {
      this.$el.find(".ss-standings-table-wrapper").html(`
                <div class="ss-standings-empty">
                    ${
                      SawahSports.i18n.noStandings ||
                      "No standings data available"
                    }
                </div>
            `);
    }

    showError(message) {
      this.$el.find(".ss-standings-table-wrapper").html(`
                <div class="ss-standings-error">
                    ${this.escapeHtml(message)}
                </div>
            `);
    }

    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // Initialize all standings widgets
  $(window).on("elementor/frontend/init", function () {
    elementorFrontend.hooks.addAction(
      "frontend/element_ready/sawah_sports_standings_premium.default",
      function ($scope) {
        new SawahStandingsPremium($scope.find(".ss-standings-premium")[0]);
      }
    );
  });

  // Also initialize on regular page load (non-Elementor preview)
  $(document).ready(function () {
    $(".ss-standings-premium").each(function () {
      new SawahStandingsPremium(this);
    });
  });
})(jQuery);
