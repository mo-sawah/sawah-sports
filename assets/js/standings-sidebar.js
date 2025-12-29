/**
 * Sawah Sports - Sidebar Standings Widget JavaScript
 * Compact standings for sidebars
 */

(function ($) {
  "use strict";

  class SawahStandingsSidebar {
    constructor(element) {
      this.$el = $(element);
      this.widgetId = this.$el.attr("id");
      this.seasonId = this.$el.data("season-id");
      this.showTeams = parseInt(this.$el.data("show-teams")) || 5;
      this.showMoreBtn = this.$el.data("show-more") === "yes";
      this.primaryColor = this.$el.data("primary-color") || "#000000";
      this.accentColor = this.$el.data("accent-color") || "#f59e0b";

      this.standings = [];
      this.expanded = false;

      // Set CSS variables for colors
      this.$el[0].style.setProperty("--ss-primary-color", this.primaryColor);
      this.$el[0].style.setProperty("--ss-accent-color", this.accentColor);

      this.init();
    }

    init() {
      this.bindEvents();
      this.fetchStandings();
    }

    bindEvents() {
      // More button toggle
      this.$el.on("click", ".ss-sidebar-more-btn", (e) => {
        e.preventDefault();
        this.toggleExpanded();
      });
    }

    toggleExpanded() {
      this.expanded = !this.expanded;
      const $btn = this.$el.find(".ss-sidebar-more-btn");
      const $hiddenRows = this.$el.find("tbody tr.hidden");

      if (this.expanded) {
        $hiddenRows.addClass("expanded");
        $btn.text(SawahSports.i18n.less || "Less").addClass("expanded");
      } else {
        $hiddenRows.removeClass("expanded");
        $btn.text(SawahSports.i18n.more || "More").removeClass("expanded");
      }
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
          // Handle WordPress REST response wrapper
          let data = response;
          if (response.success !== undefined && response.data) {
            data = response.data;
          }

          // Handle Sportmonks API structure: { data: [...] }
          if (data.data && Array.isArray(data.data)) {
            this.standings = data.data;
          } else if (Array.isArray(data)) {
            this.standings = data;
          } else {
            this.showError("Invalid standings data format");
            return;
          }

          // Filter to get only overall standings (not home/away)
          this.standings = this.standings.filter((standing) => {
            const typeName = (
              standing.type_name ||
              standing.type?.name ||
              ""
            ).toLowerCase();
            return !typeName.includes("home") && !typeName.includes("away");
          });

          if (!this.standings || this.standings.length === 0) {
            this.showError("No standings data available");
            return;
          }

          this.renderTable();
        },
        error: (xhr) => {
          const errorMsg =
            xhr.responseJSON?.message ||
            xhr.statusText ||
            "Failed to load standings";
          this.showError(errorMsg);
        },
      });
    }

    renderTable() {
      // Sort by position
      this.standings.sort((a, b) => a.position - b.position);

      let html = '<table class="ss-sidebar-table"><thead><tr>';

      // Headers
      html += "<th>Pos</th>";
      html += "<th>Team</th>";
      html += '<th class="ss-stat">P</th>';
      html += '<th class="ss-stat">W</th>';
      html += '<th class="ss-stat">D</th>';
      html += '<th class="ss-stat">L</th>';
      html += '<th class="ss-pts">PTS</th>';
      html += "</tr></thead><tbody>";

      // Rows
      this.standings.forEach((team, index) => {
        const position = team.position || index + 1;
        const stats = this.extractStats(team);
        const isHidden = index >= this.showTeams;
        const rowClass = isHidden ? "hidden" : "";

        html += `<tr class="${rowClass}">`;

        // Position
        html += `<td class="ss-sidebar-pos">${position}</td>`;

        // Team
        html += '<td><div class="ss-sidebar-team">';
        if (team.participant && team.participant.image_path) {
          html += `<img src="${this.escapeHtml(
            team.participant.image_path
          )}" alt="" class="ss-sidebar-team-logo" loading="lazy">`;
        }
        html += `<span class="ss-sidebar-team-name">${this.escapeHtml(
          team.participant?.name || "Unknown"
        )}</span>`;
        html += "</div></td>";

        // Stats
        html += `<td class="ss-stat">${stats.played}</td>`;
        html += `<td class="ss-stat">${stats.won}</td>`;
        html += `<td class="ss-stat">${stats.draw}</td>`;
        html += `<td class="ss-stat">${stats.lost}</td>`;

        // Points
        html += `<td class="ss-pts">${team.points || 0}</td>`;

        html += "</tr>";
      });

      html += "</tbody></table>";

      this.$el.find(".ss-sidebar-table-wrapper").html(html);

      // Show/hide More button
      if (this.showMoreBtn && this.standings.length > this.showTeams) {
        this.$el.find(".ss-sidebar-more-wrapper").show();
      }
    }

    extractStats(teamStanding) {
      const stats = {
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
      };

      if (!teamStanding.details || !Array.isArray(teamStanding.details)) {
        return stats;
      }

      teamStanding.details.forEach((detail) => {
        const typeId = detail.type?.id;
        const typeName = detail.type?.name?.toLowerCase() || "";
        const value = parseInt(detail.value) || 0;

        // Match by type ID or name
        // Sportmonks type IDs: 129 = played, 130 = won, 131 = draw, 132 = lost
        if (
          typeId === 129 ||
          typeName.includes("played") ||
          typeName.includes("games")
        ) {
          stats.played = value;
        } else if (typeId === 130 || typeName.includes("won")) {
          stats.won = value;
        } else if (typeId === 131 || typeName.includes("draw")) {
          stats.draw = value;
        } else if (typeId === 132 || typeName.includes("lost")) {
          stats.lost = value;
        }
      });

      return stats;
    }

    showLoading() {
      this.$el.find(".ss-sidebar-table-wrapper").html(`
        <div class="ss-loading">
          <div class="ss-spinner"></div>
        </div>
      `);
    }

    showError(message) {
      this.$el.find(".ss-sidebar-table-wrapper").html(`
        <div class="ss-error">${this.escapeHtml(message)}</div>
      `);
    }

    showEmpty() {
      this.$el.find(".ss-sidebar-table-wrapper").html(`
        <div class="ss-empty">No standings data available</div>
      `);
    }

    escapeHtml(text) {
      if (!text) return "";
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // Initialize on document ready
  $(document).ready(function () {
    $(".ss-standings-sidebar").each(function () {
      new SawahStandingsSidebar(this);
    });
  });
})(jQuery);
