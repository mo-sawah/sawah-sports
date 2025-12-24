<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Enhanced Sportmonks API Client
 * Supports all v3 endpoints with better error handling and logging
 */
final class Sawah_Sports_API_Client {
    private $base_url = 'https://api.sportmonks.com/v3/football/';
    private $token = '';
    private $last_error = '';

    public function __construct(string $token) {
        $this->token = $token;
    }

    /**
     * Build full API URL with query parameters
     */
    private function build_url(string $path, array $query = []): string {
        $query['api_token'] = $this->token;
        
        // Auto-detect locale for translations
        $wp_locale = function_exists('determine_locale') ? determine_locale() : get_locale();
        $sm_locale = strtolower(substr((string)$wp_locale, 0, 2));
        if (!empty($sm_locale) && $sm_locale !== 'en' && !isset($query['locale'])) {
            $query['locale'] = $sm_locale;
        }
        
        $url = trailingslashit($this->base_url) . ltrim($path, '/');
        return add_query_arg($query, $url);
    }

    /**
     * Make GET request to API
     */
    public function get(string $path, array $query = [], int $timeout = 12): array {
        if (empty($this->token)) {
            return ['ok' => false, 'status' => 0, 'error' => 'Missing API token'];
        }

        $url = $this->build_url($path, $query);
        
        $resp = wp_remote_get($url, [
            'timeout' => $timeout,
            'headers' => [
                'Accept' => 'application/json',
                'User-Agent' => 'Sawah-Sports-Premium/' . SAWAH_SPORTS_VERSION . ' WordPress/' . get_bloginfo('version'),
            ],
        ]);

        if (is_wp_error($resp)) {
            $this->last_error = $resp->get_error_message();
            return ['ok' => false, 'status' => 0, 'error' => $this->last_error];
        }

        $code = (int) wp_remote_retrieve_response_code($resp);
        $body = (string) wp_remote_retrieve_body($resp);
        $json = json_decode($body, true);

        if ($code < 200 || $code >= 300) {
            $msg = 'HTTP ' . $code;
            if (is_array($json) && isset($json['message'])) {
                $msg = $json['message'];
            } elseif ($code === 429) {
                $msg = 'Rate limit exceeded';
            } elseif ($code === 401) {
                $msg = 'Invalid API token';
            } elseif ($code === 403) {
                $msg = 'Access forbidden - check your subscription plan';
            }
            
            $this->last_error = $msg;
            return ['ok' => false, 'status' => $code, 'error' => $msg, 'raw' => $body];
        }

        if (!is_array($json)) {
            $this->last_error = 'Invalid JSON response';
            return ['ok' => false, 'status' => $code, 'error' => 'Invalid JSON', 'raw' => $body];
        }

        return ['ok' => true, 'status' => $code, 'data' => $json];
    }

    /**
     * Get livescores (in-play matches)
     */
    public function get_livescores(array $params = []): array {
        $defaults = ['include' => 'participants;league;scores;state;periods'];
        $params = array_merge($defaults, $params);
        return $this->get('livescores/inplay', $params, 12);
    }

    /**
     * Get fixtures by date
     */
    public function get_fixtures_by_date(string $date, array $params = []): array {
        $defaults = ['include' => 'participants;league;scores;state'];
        $params = array_merge($defaults, $params);
        return $this->get('fixtures/date/' . rawurlencode($date), $params, 15);
    }

    /**
     * Get fixture by ID with full details
     */
    public function get_fixture(int $fixture_id, array $includes = []): array {
        $include_str = empty($includes) 
            ? 'participants;league;scores;state;events;lineups;statistics;xGFixture;predictions;odds;tvStations;referees'
            : implode(';', $includes);
        return $this->get('fixtures/' . $fixture_id, ['include' => $include_str], 15);
    }

    /**
     * Get standings for a season
     */
    public function get_standings(int $season_id, array $params = []): array {
        $defaults = ['include' => 'participant;details.type;form'];
        $params = array_merge($defaults, $params);
        return $this->get('standings/seasons/' . $season_id, $params, 15);
    }

    /**
     * Get xG data by fixture
     */
    public function get_xg_by_fixture(int $fixture_id): array {
        return $this->get('expected/fixtures/' . $fixture_id, ['include' => 'type'], 12);
    }

    /**
     * Get pre-match odds
     */
    public function get_odds(int $fixture_id, array $params = []): array {
        $defaults = ['include' => 'bookmaker;market'];
        $params = array_merge($defaults, $params);
        return $this->get('odds/pre-match/fixtures/' . $fixture_id, $params, 12);
    }

    /**
     * Get predictions for a fixture
     */
    public function get_predictions(int $fixture_id): array {
        return $this->get('predictions/probabilities/fixtures/' . $fixture_id, [], 12);
    }

    /**
     * Get value bets for a fixture
     */
    public function get_value_bets(int $fixture_id): array {
        return $this->get('predictions/valuebets/fixtures/' . $fixture_id, [], 12);
    }

    /**
     * Get team details
     */
    public function get_team(int $team_id, array $includes = []): array {
        $include_str = empty($includes)
            ? 'country;venue'
            : implode(';', $includes);
        return $this->get('teams/' . $team_id, ['include' => $include_str], 12);
    }

    /**
     * Get team squad
     */
    public function get_team_squad(int $team_id): array {
        return $this->get('squads/seasons/' . $team_id, ['include' => 'player;position'], 12);
    }

    /**
     * Get player details
     */
    public function get_player(int $player_id): array {
        return $this->get('players/' . $player_id, ['include' => 'position;country;statistics'], 12);
    }

    /**
     * Get topscorers for a season
     */
    public function get_topscorers(int $season_id, string $type = 'goals'): array {
        $type_map = [
            'goals' => 208,
            'assists' => 79,
            'cards' => 84,
        ];
        $type_id = $type_map[$type] ?? 208;
        return $this->get('topscorers/seasons/' . $season_id, [
            'include' => 'participant;player;type',
            'filters' => 'topscorertypeTypes:' . $type_id
        ], 12);
    }

    /**
     * Get head-to-head data
     */
    public function get_h2h(int $team1_id, int $team2_id): array {
        return $this->get('fixtures/head-to-head/' . $team1_id . '/' . $team2_id, [
            'include' => 'participants;scores;league;state'
        ], 12);
    }

    /**
     * Get injuries and suspensions
     */
    public function get_sidelined(int $team_id): array {
        return $this->get('teams/' . $team_id, ['include' => 'sidelined.player'], 12);
    }

    /**
     * Get referee details
     */
    public function get_referee(int $referee_id): array {
        return $this->get('referees/' . $referee_id, ['include' => 'country;statistics'], 12);
    }

    /**
     * Get TV stations for a fixture
     */
    public function get_tv_stations(int $fixture_id): array {
        return $this->get('fixtures/' . $fixture_id, ['include' => 'tvStations.tvstation'], 12);
    }

    /**
     * Get last error message
     */
    public function get_last_error(): string {
        return $this->last_error;
    }
}
