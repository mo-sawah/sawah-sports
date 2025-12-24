<?php
if (!defined('ABSPATH')) { exit; }

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
        register_rest_route('sawah-sports/v1', '/livescores', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_livescores'],
            'args' => [
                'league_id' => ['type' => 'string', 'required' => false],
                'include' => ['type' => 'string', 'required' => false],
            ],
        ]);

        register_rest_route('sawah-sports/v1', '/fixtures', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_fixtures'],
            'args' => [
                'date' => ['type' => 'string', 'required' => false],
                'league_id' => ['type' => 'string', 'required' => false],
                'team_id' => ['type' => 'string', 'required' => false],
                'start' => ['type' => 'string', 'required' => false],
                'end' => ['type' => 'string', 'required' => false],
                'include' => ['type' => 'string', 'required' => false],
            ],
        ]);

        register_rest_route('sawah-sports/v1', '/standings', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'get_standings'],
            'args' => [
                'season_id' => ['type' => 'integer', 'required' => true],
                'include' => ['type' => 'string', 'required' => false],
            ],
        ]);
    }

    private function rate_limit_or_die(string $route) {
        $s = Sawah_Sports_Helpers::settings();
        $limit = max(10, (int)($s['rate_limit_per_min'] ?? 60));
        $ip = Sawah_Sports_Helpers::get_client_ip();
        $key = Sawah_Sports_Helpers::rate_limit_key($route, $ip);
        $count = (int) get_transient($key);
        if ($count >= $limit) {
            return new WP_Error('rate_limited', 'Rate limited', ['status' => 429]);
        }
        set_transient($key, $count + 1, 60);
        return true;
    }

    private function client(): Sawah_Sports_API_Client {
        return new Sawah_Sports_API_Client(Sawah_Sports_Helpers::api_token());
    }

    public function get_livescores(WP_REST_Request $req) {
        $rl = $this->rate_limit_or_die('livescores');
        if (is_wp_error($rl)) return $rl;

        $s = Sawah_Sports_Helpers::settings();
        $league_id = Sawah_Sports_Helpers::sanitize_int_list($req->get_param('league_id'));
        $include = $req->get_param('include');
        if (empty($include)) $include = 'participants,league';

        $query = ['include' => sanitize_text_field($include)];
        if (!empty($league_id)) {
            // Sportmonks supports filters; in v3 many endpoints accept filters[league_id]=
            // We keep it flexible by passing filters[league_id] when present.
            $query['filters[league_id]'] = $league_id;
        }

        $cache_key = 'ss_live_' . md5(json_encode($query));
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        // In-play livescores endpoint.
        $res = $this->client()->get('livescores/inplay', $query, 12);
        if (!$res['ok']) return new WP_Error('sportmonks_error', $res['error'] ?? 'error', ['status' => 502]);

        $payload = $res['data'];
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $payload, (int)$s['ttl_live']);
        }
        return rest_ensure_response($payload);
    }

    public function get_fixtures(WP_REST_Request $req) {
        $rl = $this->rate_limit_or_die('fixtures');
        if (is_wp_error($rl)) return $rl;

        $s = Sawah_Sports_Helpers::settings();
        $include = $req->get_param('include');
        if (empty($include)) $include = 'participants,league';

        $league_id = Sawah_Sports_Helpers::sanitize_int_list($req->get_param('league_id'));
        $team_id = Sawah_Sports_Helpers::sanitize_int_list($req->get_param('team_id'));
        $date = sanitize_text_field((string)$req->get_param('date'));
        $start = sanitize_text_field((string)$req->get_param('start'));
        $end = sanitize_text_field((string)$req->get_param('end'));

        $query = ['include' => sanitize_text_field($include)];

        $path = 'fixtures';
        if (!empty($date)) {
            // /fixtures/date/{date}
            $path = 'fixtures/date/' . rawurlencode($date);
        } elseif (!empty($start) && !empty($end) && !empty($team_id)) {
            // /fixtures/between/{start}/{end}/{team_id}
            $path = 'fixtures/between/' . rawurlencode($start) . '/' . rawurlencode($end) . '/' . rawurlencode($team_id);
        }

        if (!empty($league_id)) $query['filters[league_id]'] = $league_id;

        $cache_key = 'ss_fix_' . md5($path . '|' . json_encode($query));
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get($path, $query, 15);
        if (!$res['ok']) return new WP_Error('sportmonks_error', $res['error'] ?? 'error', ['status' => 502]);

        $payload = $res['data'];
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $payload, (int)$s['ttl_fixtures']);
        }

        return rest_ensure_response($payload);
    }

    public function get_standings(WP_REST_Request $req) {
        $rl = $this->rate_limit_or_die('standings');
        if (is_wp_error($rl)) return $rl;

        $s = Sawah_Sports_Helpers::settings();
        $season_id = (int)$req->get_param('season_id');
        if ($season_id <= 0) return new WP_Error('bad_request', 'season_id required', ['status' => 400]);

        $include = $req->get_param('include');
        if (empty($include)) $include = 'participant';

        $query = ['include' => sanitize_text_field($include)];

        $cache_key = 'ss_std_' . md5($season_id . '|' . json_encode($query));
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        // Standings endpoint pattern varies; common v3 is /standings/seasons/{id}
        $res = $this->client()->get('standings/seasons/' . $season_id, $query, 15);
        if (!$res['ok']) return new WP_Error('sportmonks_error', $res['error'] ?? 'error', ['status' => 502]);

        $payload = $res['data'];
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $payload, (int)$s['ttl_standings']);
        }
        return rest_ensure_response($payload);
    }
}
