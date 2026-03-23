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

        // New Matches Full Widget
        register_rest_route($namespace, '/new-matches-full/(?P<season_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_new_matches_full'],
        ]);

        // New Standings Widgets (BBC Style)
        register_rest_route($namespace, '/new-standings/(?P<season_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_new_standings'],
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

    public function get_new_matches_full(WP_REST_Request $req) {
        $check = $this->rate_limit_check('season_fixtures');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $season_id = (int) $req->get_param('season_id');
        
        $cache_key = 'ss_new_matches_full_v2_' . $season_id;
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        // Fetch ALL rounds for the season including their fixtures
        $res = $this->client()->get('rounds/seasons/' . $season_id, [
            'include' => 'fixtures.participants;fixtures.scores;fixtures.state'
        ], 20);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', 'Failed to fetch rounds data.', ['status' => $res['status'] ?? 502]);
        }

        $rounds = $res['data']['data'] ?? [];
        $gameweeks = [];
        $current_gw_id = null;

        // Group concurrent rounds, but separate identically named rounds from different months (Playoffs vs Regular)
        foreach ($rounds as $r) {
            $name = (string)($r['name'] ?? '');
            if (empty($name)) continue;

            // Unique ID combining the Name and the Year-Month it starts
            $month = isset($r['starting_at']) ? substr($r['starting_at'], 0, 7) : '0000-00';
            $gw_id = $name . '_' . $month;

            if (!isset($gameweeks[$gw_id])) {
                $gameweeks[$gw_id] = [
                    'id' => $gw_id,
                    'name' => $name,
                    'is_current' => false,
                    'start_date' => $r['starting_at'] ?? '9999-12-31',
                    'fixtures' => []
                ];
            }

            if (!empty($r['is_current'])) {
                $gameweeks[$gw_id]['is_current'] = true;
                $current_gw_id = $gw_id;
            }

            // Track earliest start date for accurate chronological sorting
            if (isset($r['starting_at']) && $r['starting_at'] < $gameweeks[$gw_id]['start_date']) {
                $gameweeks[$gw_id]['start_date'] = $r['starting_at'];
            }

            if (!empty($r['fixtures'])) {
                foreach ($r['fixtures'] as $fx) {
                    $date = substr((string)($fx['starting_at'] ?? ''), 0, 10);
                    if (strlen($date) === 10) {
                        $gameweeks[$gw_id]['fixtures'][$date][] = $fx;
                    }
                }
            }
        }

        // Fallback: If no round is active (e.g. International Break), find the one closest to TODAY
        if (!$current_gw_id && !empty($gameweeks)) {
            $closest_gw = null;
            $min_diff = PHP_INT_MAX;
            $now = time();
            foreach ($gameweeks as $id => $gw) {
                $time = strtotime($gw['start_date']);
                $diff = abs($now - $time);
                if ($diff < $min_diff) {
                    $min_diff = $diff;
                    $closest_gw = $id;
                }
            }
            $current_gw_id = $closest_gw;
        }

        // Sort dates within each gameweek
        foreach ($gameweeks as &$gw_data) {
            ksort($gw_data['fixtures']);
        }

        // Convert to indexed array and sort the slider chronologically
        $gameweeks_list = array_values($gameweeks);
        usort($gameweeks_list, function($a, $b) {
            return strcmp($a['start_date'], $b['start_date']);
        });

        $output = [
            'gameweeks' => $gameweeks_list,
            'current' => $current_gw_id
        ];

        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $output, (int)($s['ttl_fixtures'] ?? 300));
        }

        return rest_ensure_response($output);
    }

    public function get_new_standings(WP_REST_Request $req) {
        $check = $this->rate_limit_check('standings');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $season_id = (int)$req->get_param('season_id');
        
        $cache_key = 'ss_new_standings_v1_' . $season_id;
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        // Using the exact includes recommended by the AI
        $res = $this->client()->get('standings/seasons/' . $season_id, [
            'include' => 'participant;details.type;form;rule'
        ], 15);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', 'Failed to fetch standings', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data']['data'] ?? [];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)($s['ttl_standings'] ?? 3600));
        }

        return rest_ensure_response($data);
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

    public function get_season_fixtures(WP_REST_Request $req) {
        $check = $this->rate_limit_check('season_fixtures');
        if (is_wp_error($check)) return $check;

        $s = Sawah_Sports_Helpers::settings();
        $league_id = (int) $req->get_param('league_id'); 
        
        // 1. Grab the limits from your Elementor settings
        $past_limit   = max(1, (int) ($req->get_param('past_dates') ?: 1));
        $future_limit = max(1, (int) ($req->get_param('upcoming_dates') ?: 2));
        
        // 2. Include the limits in the cache key so it remembers your settings
        $cache_key = 'ss_league_latest_upcoming_v2_' . $league_id . '_' . $past_limit . '_' . $future_limit;
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_league_latest_upcoming($league_id);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', 'Failed to fetch league data.', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data']['data'] ?? [];
        $latest = $data['latest'] ?? [];
        $upcoming = $data['upcoming'] ?? [];

        $output = ['past' => [], 'upcoming' => []];

        $group_by_date = function($fixtures) {
            $grouped = [];
            if (!is_array($fixtures)) return $grouped;
            if (isset($fixtures['id'])) $fixtures = [$fixtures];

            foreach ($fixtures as $fx) {
                $date = substr((string)($fx['starting_at'] ?? ''), 0, 10);
                if (strlen($date) === 10) {
                    $grouped[$date][] = $fx;
                }
            }
            return $grouped;
        };

        $output['past'] = $group_by_date($latest);
        $output['upcoming'] = $group_by_date($upcoming);

        krsort($output['past']);
        ksort($output['upcoming']);

        // 3. THE FIX: Slice the arrays exactly to your Elementor settings!
        $output['past']     = array_slice($output['past'], 0, $past_limit, true);
        $output['upcoming'] = array_slice($output['upcoming'], 0, $future_limit, true);

        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $output, (int)($s['ttl_fixtures'] ?? 300));
        }

        return rest_ensure_response($output);
    }

    /**
     * Slice to N rounds and flatten to date-keyed array for JS rendering.
     */
    private function slice_by_rounds(array $data, int $past_limit, int $future_limit): array {
        // Past: take the LAST N rounds (most recent)
        $past_rounds = array_values($data['past'] ?? []);
        $past_slice  = array_slice($past_rounds, -$past_limit);
        $past_flat   = [];
        foreach (array_reverse($past_slice) as $round_dates) {
            krsort($round_dates);
            foreach ($round_dates as $date => $fixtures) {
                $past_flat[$date] = isset($past_flat[$date])
                    ? array_merge($past_flat[$date], $fixtures)
                    : $fixtures;
            }
        }

        // Upcoming: take the FIRST N rounds (soonest)
        $future_rounds = array_values($data['upcoming'] ?? []);
        $future_slice  = array_slice($future_rounds, 0, $future_limit);
        $future_flat   = [];
        foreach ($future_slice as $round_dates) {
            ksort($round_dates);
            foreach ($round_dates as $date => $fixtures) {
                $future_flat[$date] = isset($future_flat[$date])
                    ? array_merge($future_flat[$date], $fixtures)
                    : $fixtures;
            }
        }

        return ['past' => $past_flat, 'upcoming' => $future_flat];
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