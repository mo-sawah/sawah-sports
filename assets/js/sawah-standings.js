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
      this.standingsData = null;

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

      // Main tabs (if implemented later)
      this.$el.on("click", ".ss-main-tab", (e) => {
        const $btn = $(e.currentTarget);
        const tab = $btn.data("tab");

        this.$el.find(".ss-main-tab").removeClass("active");
        $btn.addClass("active");

        // For now, only standings tab works
        if (tab === "standings") {
          this.$el.find(".ss-standings-content").show();
        } else {
          // Placeholder for future Statistics/Details tabs
          this.showComingSoon(tab);
        }
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
            this.standingsData = data.data;
          } else if (Array.isArray(data)) {
            this.standingsData = data;
          } else {
            console.error("Unexpected data structure:", data);
            this.showError("Invalid standings data format");
            return;
          }

          if (!this.standingsData || this.standingsData.length === 0) {
            this.showError("No standings data available for this season");
            return;
          }

          console.log("Parsed standings data:", this.standingsData);
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
      console.log("renderTable called with data:", this.standingsData);

      if (!this.standingsData || !this.standingsData.length) {
        console.warn("No standings data or empty array");
        this.showEmpty();
        return;
      }

      // The standings data is already an array of team standings
      // Each item represents a team's position in the table
      // We don't need to filter by type here - the API returns overall, home, away separately

      // For now, use the standings data directly
      // TODO: Implement proper home/away filtering when API supports it
      const details = this.standingsData;

      console.log("Building table with", details.length, "teams");

      const html = this.buildTableHTML(details);
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

      teamStanding.details.forEach((detail) => {
        const typeName = detail.type?.name?.toLowerCase() || "";
        const value = detail.value || 0;

        if (typeName.includes("played")) stats.played = value;
        else if (typeName.includes("won")) stats.won = value;
        else if (typeName.includes("draw")) stats.draw = value;
        else if (typeName.includes("lost")) stats.lost = value;
        else if (
          typeName.includes("goals_for") ||
          typeName.includes("goalsfor")
        )
          stats.goalsFor = value;
        else if (
          typeName.includes("goals_against") ||
          typeName.includes("goalsagainst")
        )
          stats.goalsAgainst = value;
      });

      stats.diff = stats.goalsFor - stats.goalsAgainst;
      return stats;
    }

    renderForm(formData) {
      if (!formData || !Array.isArray(formData)) return "—";

      // Take last N matches
      const recent = formData.slice(-this.formCount).reverse();

      let html = '<div class="ss-form-badges">';
      recent.forEach((result) => {
        const outcome = result.outcome?.toLowerCase() || "";
        let badge = "draw";
        let letter = "D";

        if (outcome.includes("win")) {
          badge = "win";
          letter = "W";
        } else if (outcome.includes("loss") || outcome.includes("lost")) {
          badge = "loss";
          letter = "L";
        }

        html += `<span class="ss-form-badge ${badge}">${letter}</span>`;
      });
      html += "</div>";

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

    showComingSoon(tab) {
      this.$el.find(".ss-standings-table-wrapper").html(`
                <div class="ss-standings-empty">
                    ${
                      tab.charAt(0).toUpperCase() + tab.slice(1)
                    } tab coming soon...
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
