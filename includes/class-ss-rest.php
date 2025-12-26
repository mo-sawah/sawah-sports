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
        $cache_key = 'ss_fix_' . md5($date);
        
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get_fixtures_by_date($date);
        
        if (!$res['ok']) {
            return new WP_Error('api_error', $res['error'] ?? 'API error', ['status' => $res['status'] ?? 502]);
        }

        $data = $res['data'];
        
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_fixtures']);
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
            Sawah_Sports_Cache::set($cache_key, $data, (int)$s['ttl_fixtures']);
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
        
        // CRITICAL FIX: Sort by total (descending)
        if (isset($data['data']) && is_array($data['data'])) {
            usort($data['data'], function($a, $b) {
                $a_total = (int)($a['total'] ?? 0);
                $b_total = (int)($b['total'] ?? 0);
                return $b_total - $a_total; // Descending order
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