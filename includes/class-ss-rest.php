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

        // 1. Livescores
        register_rest_route($namespace, '/livescores', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_livescores'],
        ]);

        // 2. Fixtures (The endpoint you need)
        register_rest_route($namespace, '/fixtures', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_fixtures'],
        ]);

        // 3. Single fixture
        register_rest_route($namespace, '/fixture/(?P<id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_fixture'],
        ]);

        // 4. Standings
        register_rest_route($namespace, '/standings/(?P<season_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_standings'],
        ]);

        // 5. Team Stats by Season
        register_rest_route($namespace, '/season/teams/(?P<season_id>\d+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_season_teams_stats'],
        ]);

        // 6. Other Endpoints (Full List)
        register_rest_route($namespace, '/xg/(?P<fixture_id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'get_xg']]);
        register_rest_route($namespace, '/odds/(?P<fixture_id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'get_odds']]);
        register_rest_route($namespace, '/predictions/(?P<fixture_id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'get_predictions']]);
        register_rest_route($namespace, '/valuebets/(?P<fixture_id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'get_valuebets']]);
        register_rest_route($namespace, '/team/(?P<id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'get_team']]);
        register_rest_route($namespace, '/player/(?P<id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'get_player']]);
        register_rest_route($namespace, '/topscorers/(?P<season_id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'get_topscorers']]);
        register_rest_route($namespace, '/h2h/(?P<team1>\d+)/(?P<team2>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'get_h2h']]);
        register_rest_route($namespace, '/sidelined/(?P<team_id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'get_sidelined']]);
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

    // --- CALLBACKS ---

    public function get_livescores(WP_REST_Request $req) {
        $check = $this->rate_limit_check('livescores');
        if (is_wp_error($check)) return $check;
        return rest_ensure_response($this->client()->get_livescores());
    }

    public function get_fixtures(WP_REST_Request $req) {
        $check = $this->rate_limit_check('fixtures');
        if (is_wp_error($check)) return $check;

        $date = $req->get_param('date') ?: date('Y-m-d');
        return rest_ensure_response($this->client()->get_fixtures_by_date($date));
    }

    public function get_fixture(WP_REST_Request $req) {
        $check = $this->rate_limit_check('fixture');
        if (is_wp_error($check)) return $check;
        return rest_ensure_response($this->client()->get_fixture((int)$req->get_param('id')));
    }

    public function get_standings(WP_REST_Request $req) {
        $check = $this->rate_limit_check('standings');
        if (is_wp_error($check)) return $check;
        return rest_ensure_response($this->client()->get_standings((int)$req->get_param('season_id')));
    }

    public function get_season_teams_stats(WP_REST_Request $req) {
        $check = $this->rate_limit_check('team');
        if (is_wp_error($check)) return $check;
        return rest_ensure_response($this->client()->get_teams_by_season((int)$req->get_param('season_id')));
    }

    public function get_xg(WP_REST_Request $req) { return rest_ensure_response($this->client()->get_xg_by_fixture((int)$req->get_param('fixture_id'))); }
    public function get_odds(WP_REST_Request $req) { return rest_ensure_response($this->client()->get_odds((int)$req->get_param('fixture_id'))); }
    public function get_predictions(WP_REST_Request $req) { return rest_ensure_response($this->client()->get_predictions((int)$req->get_param('fixture_id'))); }
    public function get_valuebets(WP_REST_Request $req) { return rest_ensure_response($this->client()->get_value_bets((int)$req->get_param('fixture_id'))); }
    public function get_team(WP_REST_Request $req) { return rest_ensure_response($this->client()->get_team((int)$req->get_param('id'))); }
    public function get_player(WP_REST_Request $req) { return rest_ensure_response($this->client()->get_player((int)$req->get_param('id'))); }
    
    public function get_topscorers(WP_REST_Request $req) {
        $res = $this->client()->get_topscorers((int)$req->get_param('season_id'), $req->get_param('type') ?: 'goals');
        if (isset($res['data']['data']) && is_array($res['data']['data'])) {
            usort($res['data']['data'], function($a, $b) { return (int)($b['total'] ?? 0) - (int)($a['total'] ?? 0); });
        }
        return rest_ensure_response($res['data'] ?? []);
    }

    public function get_h2h(WP_REST_Request $req) { return rest_ensure_response($this->client()->get_h2h((int)$req->get_param('team1'), (int)$req->get_param('team2'))); }
    public function get_sidelined(WP_REST_Request $req) { return rest_ensure_response($this->client()->get_sidelined((int)$req->get_param('team_id'))); }
}