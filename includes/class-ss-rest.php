<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Enhanced REST API Controller
 * Provides public endpoints for all football data
 */
final class Sawah_Sports_REST {
    private static $instance = null;

    public static function instance() {
        if (self::$instance === null) self::$instance = new self();
        return self::$instance;
    }

    private function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public function register_routes() {
        $namespace = 'sawah-sports/v1';

        // Livescores
        register_rest_route($namespace, '/livescores', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_livescores'],
        ]);

        // Fixtures
        register_rest_route($namespace, '/fixtures', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_fixtures'],
        ]);

        // Single fixture
        register_rest_route($namespace, '/fixture/(?P<id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_fixture'],
        ]);

        // Standings
        register_rest_route($namespace, '/standings/(?P<season_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_standings'],
        ]);
        
        // Team Stats by Season (Stats Center)
        register_rest_route($namespace, '/season/teams/(?P<season_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_season_teams_stats'],
        ]);

        // Season Fixtures — NEW: Fixtures & Results widget (uses League ID)
        register_rest_route($namespace, '/league-fixtures/(?P<league_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_season_fixtures'],
        ]);

        // xG data
        register_rest_route($namespace, '/xg/(?P<fixture_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_xg'],
        ]);

        // Odds
        register_rest_route($namespace, '/odds/(?P<fixture_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_odds'],
        ]);

        // Predictions
        register_rest_route($namespace, '/predictions/(?P<fixture_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_predictions'],
        ]);

        // Value bets
        register_rest_route($namespace, '/valuebets/(?P<fixture_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_valuebets'],
        ]);

        // Team
        register_rest_route($namespace, '/team/(?P<id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_team'],
        ]);

        // Player
        register_rest_route($namespace, '/player/(?P<id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_player'],
        ]);

        // Top scorers
        register_rest_route($namespace, '/topscorers/(?P<season_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_topscorers'],
        ]);

        // Head-to-head
        register_rest_route($namespace, '/h2h/(?P<team1>\d+)/(?P<team2>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_h2h'],
        ]);

        // Injuries/Sidelined
        register_rest_route($namespace, '/sidelined/(?P<team_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_sidelined'],
        ]);
    }

    private function rate_limit_check(string $route) {
        $s = Sawah_Sports_Helpers::settings();
        $limit = max(10, (int)($s['rate_limit_per_min'] ?? 60));
        $ip = Sawah_Sports_Helpers::get_client_ip();
        $key = Sawah_Sports_Helpers::rate_limit_key($route, $ip);
        $count = (int) get_transient($key);
        
        if ($count >= $limit) {
            return new WP_Error('rate_limited', 'Too many requests', ['status' => 429]);
        }
        
        set_transient($key, $count + 1, 60);
        return true;
    }

    private function client(): Sawah_Sports_API_Client {
        return new Sawah_Sports_API_Client(Sawah_Sports_Helpers::api_token());
    }

    public function get_livescores(WP_REST_Request $req) {
        $check = $this->rate_limit_check('livescores');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $cache_key = 'ss_live_' . md5(json_encode($req->get_params()));
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_livescores();
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_live']);
        }

        return rest_ensure_response($data);
    }

    public function get_fixtures(WP_REST_Request $req) {
        $check = $this->rate_limit_check('fixtures');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $date = $req->get_param('date') ?: date('Y-m-d');

        $nocache = (bool) $req->get_param('nocache');
        $is_today = ($date === date('Y-m-d'));

        $cache_key = 'ss_fix_' . md5($date);

        $ttl = $is_today ? (int)($s['ttl_live'] ?? 30) : (int)($s['ttl_fixtures'] ?? 900);
        if ($ttl < 10) $ttl = 10;

        if (!empty($s['cache_enabled']) && !$nocache) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_fixtures_by_date($date);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, $ttl);
        }

        return rest_ensure_response($data);
    }

    public function get_fixture(WP_REST_Request $req) {
        $check = $this->rate_limit_check('fixture');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $id = (int)$req->get_param('id');
        $cache_key = 'ss_fixture_' . $id;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_fixture($id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)($s['ttl_fixtures'] ?? 300));
        }

        return rest_ensure_response($data);
    }

    public function get_standings(WP_REST_Request $req) {
        $check = $this->rate_limit_check('standings');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $season_id = (int)$req->get_param('season_id');
        $cache_key = 'ss_standings_' . $season_id;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_standings($season_id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_standings']);
        }

        return rest_ensure_response($data);
    }
    
    /**
     * Get Teams Stats for Stats Center
     */
    public function get_season_teams_stats(WP_REST_Request $req) {
        $check = $this->rate_limit_check('team');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $season_id = (int)$req->get_param('season_id');
        $cache_key = 'ss_season_teams_' . $season_id;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_teams_by_season($season_id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, 3600);
        }

        return rest_ensure_response($data);
    }

    /**
     * NEW: Season Fixtures endpoint for the "Fixtures & Results" widget.
     *
     * Uses GET /v3/football/schedules/seasons/{season_id} which returns:
     *   { data: [ { id, name, ..., fixtures: [ {id, starting_at (string), ...} ] } ] }
     *
     * starting_at is a plain string: "2025-03-23 15:30:00"
     *
     * Query params:
     *   past_dates     – how many past date groups (default 1, max 5)
     *   upcoming_dates – how many future date groups (default 3, max 7)
     *   debug          – pass 1 to return raw API response for troubleshooting
     */
    public function get_season_fixtures(WP_REST_Request $req) {
        $check = $this->rate_limit_check('season_fixtures');
        if (is_wp_error($check)) return $check;

        $s            = Sawah_Sports_Helpers::settings();
        $league_id    = (int) $req->get_param('league_id');
        $past_limit   = max(1, min(5,  (int) ($req->get_param('past_dates')    ?: 1)));
        $future_limit = max(1, min(7,  (int) ($req->get_param('upcoming_dates') ?: 3)));
        $debug        = (bool) $req->get_param('debug');

        if (!$league_id) {
            return new WP_Error('bad_request', 'Season ID is required.', ['status' => 400]);
        }

        $cache_key = 'ss_lfx2_' . $league_id;

        if (!$debug && !empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached !== false) {
                return rest_ensure_response(
                    $this->slice_season_fixtures($cached, $past_limit, $future_limit)
                );
            }
        }

        // ── Call Sportmonks schedules endpoint ─────────────────────────────
        $res = $this->client()->get_schedule_by_season($league_id);

        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        // Debug mode: return raw response so you can inspect it
        if ($debug) {
            return rest_ensure_response(['_debug_raw' => $res['data']]);
        }

        // ── Unwrap fixtures response ────────────────────────────────────────
        // fixtures endpoint returns: { data: [ {...fixture...}, ... ], pagination: {...} }
        // NOT nested inside rounds like schedules endpoint
        $body = $res['data'] ?? [];

        // Handle both possible shapes
        $all = [];
        if (isset($body['data']) && is_array($body['data'])) {
            $all = $body['data'];                      // Standard: { data: [...] }
        } elseif (is_array($body) && !empty($body) && isset($body[0])) {
            $all = $body;                              // Flat array fallback
        }

        // If response has pagination and there are more pages, fetch them
        // (only up to page 3 max to avoid hammering the API)
        if (!empty($body['pagination'])) {
            $pagination = $body['pagination'];
            $total_pages = (int) ($pagination['last_page'] ?? 1);
            $current_page = (int) ($pagination['current_page'] ?? 1);

            if ($total_pages > 1 && $current_page === 1) {
                $max_pages = min($total_pages, 3);
                for ($page = 2; $page <= $max_pages; $page++) {
                    $page_res = $this->client()->get_schedule_by_season($league_id, ['page' => $page]);
                    if ($page_res['ok']) {
                        $page_body = $page_res['data'] ?? [];
                        $page_data = $page_body['data'] ?? [];
                        if (is_array($page_data)) {
                            $all = array_merge($all, $page_data);
                        }
                    }
                }
            }
        }

        if (empty($all)) {
            return rest_ensure_response([
                'past'     => [],
                'upcoming' => [],
                '_meta'    => [
                    'rounds_count'   => count($rounds),
                    'fixtures_found' => 0,
                    'note'           => 'Check season_id is correct. Add ?debug=1 to see raw API response.',
                ],
            ]);
        }

        // ── Sort all fixtures by starting_at ascending ──────────────────────
        usort($all, function ($a, $b) {
            return strcmp(
                (string) ($a['starting_at'] ?? ''),
                (string) ($b['starting_at'] ?? '')
            );
        });

        // ── Bucket by date (pure date comparison, no state dependency) ──────
        $today  = date('Y-m-d');
        $past   = [];
        $future = [];

        foreach ($all as $fx) {
            // starting_at is a plain string "2025-03-23 15:30:00"
            $sa = $fx['starting_at'] ?? '';
            if (is_array($sa)) {
                // In case API wraps it as an object in some versions
                $sa = $sa['datetime'] ?? $sa['date'] ?? '';
            }
            $date = substr((string) $sa, 0, 10); // → "2025-03-23"
            if (strlen($date) < 10) continue;

            if ($date < $today) {
                $past[$date][] = $fx;
            } else {
                $future[$date][] = $fx;
            }
        }

        // Past: newest first; future: soonest first
        krsort($past);
        ksort($future);

        $processed = ['past' => $past, 'upcoming' => $future];

        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $processed, (int) ($s['ttl_fixtures'] ?? 300));
        }

        return rest_ensure_response(
            $this->slice_season_fixtures($processed, $past_limit, $future_limit)
        );
    }

    /**
     * Return only the requested number of date groups from each section.
     */
    private function slice_season_fixtures(array $data, int $past_limit, int $future_limit): array {
        return [
            'past'     => array_slice($data['past']     ?? [], 0, $past_limit,   true),
            'upcoming' => array_slice($data['upcoming'] ?? [], 0, $future_limit, true),
        ];
    }

    public function get_xg(WP_REST_Request $req) {
        $check = $this->rate_limit_check('xg');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $fixture_id = (int)$req->get_param('fixture_id');
        $cache_key = 'ss_xg_' . $fixture_id;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_xg_by_fixture($fixture_id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_xg']);
        }

        return rest_ensure_response($data);
    }

    public function get_odds(WP_REST_Request $req) {
        $check = $this->rate_limit_check('odds');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $fixture_id = (int)$req->get_param('fixture_id');
        $cache_key = 'ss_odds_' . $fixture_id;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_odds($fixture_id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_odds']);
        }

        return rest_ensure_response($data);
    }

    public function get_predictions(WP_REST_Request $req) {
        $check = $this->rate_limit_check('predictions');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $fixture_id = (int)$req->get_param('fixture_id');
        $cache_key = 'ss_pred_' . $fixture_id;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_predictions($fixture_id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_predictions']);
        }

        return rest_ensure_response($data);
    }

    public function get_valuebets(WP_REST_Request $req) {
        $check = $this->rate_limit_check('valuebets');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $fixture_id = (int)$req->get_param('fixture_id');
        $cache_key = 'ss_vbet_' . $fixture_id;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_value_bets($fixture_id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_predictions']);
        }

        return rest_ensure_response($data);
    }

    public function get_team(WP_REST_Request $req) {
        $check = $this->rate_limit_check('team');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $id = (int)$req->get_param('id');
        $cache_key = 'ss_team_' . $id;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_team($id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_statistics']);
        }

        return rest_ensure_response($data);
    }

    public function get_player(WP_REST_Request $req) {
        $check = $this->rate_limit_check('player');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $id = (int)$req->get_param('id');
        $cache_key = 'ss_player_' . $id;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_player($id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_statistics']);
        }

        return rest_ensure_response($data);
    }

    public function get_topscorers(WP_REST_Request $req) {
        $check = $this->rate_limit_check('topscorers');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $season_id = (int)$req->get_param('season_id');
        $type = $req->get_param('type') ?: 'goals';
        $cache_key = 'ss_topscorers_v2_' . $season_id . '_' . $type;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_topscorers($season_id, $type);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (isset($data['data']) && is_array($data['data'])) {
            usort($data['data'], function($a, $b) {
                $a_total = (int)($a['total'] ?? 0);
                $b_total = (int)($b['total'] ?? 0);
                return $b_total - $a_total;
            });
        }
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_statistics']);
        }

        return rest_ensure_response($data);
    }

    public function get_h2h(WP_REST_Request $req) {
        $check = $this->rate_limit_check('h2h');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $team1 = (int)$req->get_param('team1');
        $team2 = (int)$req->get_param('team2');
        $cache_key = 'ss_h2h_' . $team1 . '_' . $team2;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_h2h($team1, $team2);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_statistics']);
        }

        return rest_ensure_response($data);
    }

    public function get_sidelined(WP_REST_Request $req) {
        $check = $this->rate_limit_check('sidelined');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $team_id = (int)$req->get_param('team_id');
        $cache_key = 'ss_sidelined_' . $team_id;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_sidelined($team_id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_statistics']);
        }

        return rest_ensure_response($data);
    }
}