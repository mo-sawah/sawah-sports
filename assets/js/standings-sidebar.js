/**
 * Sawah Sports - Sidebar Standings Widget JavaScript
 * Clean version - No "More" button
 */

(function ($) {
  "use strict";

  class SawahStandingsSidebar {
    constructor(element) {
      this.$el = $(element);
      this.seasonId = this.$el.data("season-id");
      this.showTeams = parseInt(this.$el.data("show-teams")) || 10;
      this.accentColor = this.$el.data("accent-color") || "#f59e0b";

      this.standings = [];

      // Set CSS variable for color
      this.$el[0].style.setProperty("--ss-accent-color", this.accentColor);

      this.init();
    }

    init() {
      this.fetchStandings();
    }

    fetchStandings() {
      if (!this.seasonId) {
        this.showError("No season ID specified");
        return;
      }

      $.ajax({
        url: SawahSports.restUrl + "/standings/" + this.seasonId,
        method: "GET",
        beforeSend: (xhr) => {
          xhr.setRequestHeader("X-WP-Nonce", SawahSports.nonce);
        },
        success: (response) => {
          let data = response;
          if (response.success !== undefined && response.data) {
            data = response.data;
          }

          if (data.data && Array.isArray(data.data)) {
            this.standings = data.data;
          } else if (Array.isArray(data)) {
            this.standings = data;
          } else {
            this.showError("Invalid data");
            return;
          }

          // Filter out Home/Away tables, keep only 'Total'
          this.standings = this.standings.filter((standing) => {
            const typeName = (
              standing.type_name ||
              standing.type?.name ||
              ""
            ).toLowerCase();
            return !typeName.includes("home") && !typeName.includes("away");
          });

          if (!this.standings || this.standings.length === 0) {
            this.showEmpty();
            return;
          }

          this.renderTable();
        },
        error: (xhr) => {
          this.showError("Failed to load standings");
        },
      });
    }

    renderTable() {
      // Sort by position
      this.standings.sort((a, b) => a.position - b.position);

      // Slice to show only the configured amount of teams
      const displayStandings = this.standings.slice(0, this.showTeams);

      let html = '<table class="ss-sidebar-table"><thead><tr>';

      // Headers - P, W, D, L, PTS (Clean Layout)
      html += "<th>#</th>";
      html += "<th>Team</th>";
      html += '<th class="ss-stat">P</th>';
      html += '<th class="ss-stat">W</th>';
      html += '<th class="ss-stat">D</th>';
      html += '<th class="ss-stat">L</th>';
      html += "<th>Pts</th>";
      html += "</tr></thead><tbody>";

      // Rows
      displayStandings.forEach((team, index) => {
        const position = team.position || index + 1;
        const stats = this.extractStats(team);

        html += "<tr>";

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
          team.participant?.name || "Team"
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
    }

    extractStats(teamStanding) {
      const stats = { played: 0, won: 0, draw: 0, lost: 0 };

      if (!teamStanding.details || !Array.isArray(teamStanding.details)) {
        return stats;
      }

      teamStanding.details.forEach((detail) => {
        const typeId = detail.type?.id;
        const typeName = (detail.type?.name || "").toLowerCase();
        const value = parseInt(detail.value) || 0;

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

    showError(message) {
      this.$el
        .find(".ss-sidebar-table-wrapper")
        .html(`<div class="ss-error">${message}</div>`);
    }

    showEmpty() {
      this.$el
        .find(".ss-sidebar-table-wrapper")
        .html(`<div class="ss-empty">No data</div>`);
    }

    escapeHtml(text) {
      if (!text) return "";
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // Initialize
  $(document).ready(function () {
    $(".ss-standings-sidebar").each(function () {
      new SawahStandingsSidebar(this);
    });
  });
})(jQuery);
