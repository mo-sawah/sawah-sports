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
        $league_csv = Sawah_Sports_Helpers::sanitize_int_list($req->get_param('league_id'));
        $league_ids = array_filter(array_map('intval', array_map('trim', explode(',', (string)$league_csv))));

        // Sportmonks docs: inplay livescores does NOT support filters on the endpoint.
        // We'll fetch in-play and filter server-side when league_id is provided.
        $include = $req->get_param('include');
        if (empty($include)) $include = 'participants;league;scores;state;periods';

        $query = [
            'include' => sanitize_text_field($include),
        ];

        // Auto-locale: if WP site is Greek, ask Sportmonks to translate name fields.
        $wp_locale = function_exists('determine_locale') ? determine_locale() : get_locale();
        $sm_locale = strtolower(substr((string)$wp_locale, 0, 2));
        if (!empty($sm_locale) && $sm_locale !== 'en') {
            $query['locale'] = $sm_locale;
        }

        $cache_key = 'ss_live_' . md5(json_encode([$league_csv, $query]));
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get('livescores/inplay', $query, 12);
        if (!$res['ok']) {
            $status = !empty($res['status']) ? (int)$res['status'] : 502;
            return new WP_Error('sportmonks_error', $res['error'] ?? 'Sportmonks error', ['status' => $status]);
        }

        $payload = $res['data'];

        // Filter by league ids locally (if requested)
        if (!empty($league_ids) && isset($payload['data']) && is_array($payload['data'])) {
            $payload['data'] = array_values(array_filter($payload['data'], function($fx) use ($league_ids) {
                $lid = isset($fx['league_id']) ? (int)$fx['league_id'] : 0;
                return $lid && in_array($lid, $league_ids, true);
            }));
        }

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
        if (empty($include)) $include = 'participants;league;scores;state';

        $league_csv = Sawah_Sports_Helpers::sanitize_int_list($req->get_param('league_id'));
        $league_ids = array_filter(array_map('intval', array_map('trim', explode(',', (string)$league_csv))));

        $team_id = Sawah_Sports_Helpers::sanitize_int_list($req->get_param('team_id'));
        $date = sanitize_text_field((string)$req->get_param('date'));
        $start = sanitize_text_field((string)$req->get_param('start'));
        $end = sanitize_text_field((string)$req->get_param('end'));

        $query = ['include' => sanitize_text_field($include)];

        $wp_locale = function_exists('determine_locale') ? determine_locale() : get_locale();
        $sm_locale = strtolower(substr((string)$wp_locale, 0, 2));
        if (!empty($sm_locale) && $sm_locale !== 'en') {
            $query['locale'] = $sm_locale;
        }

        // Decide endpoint
        $path = 'fixtures';
        if (!empty($date)) {
            $path = 'fixtures/date/' . rawurlencode($date);
        } elseif (!empty($start) && !empty($end) && !empty($team_id)) {
            $path = 'fixtures/between/' . rawurlencode($start) . '/' . rawurlencode($end) . '/' . rawurlencode($team_id);
        }

        // Note: some Sportmonks endpoints don't accept filters (e.g. livescores/inplay).
        // To keep this widget reliable, we fetch and filter by league server-side.
        $cache_key = 'ss_fix_' . md5($path . '|' . json_encode([$league_csv, $query]));
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get($path, $query, 15);
        if (!$res['ok']) {
            $status = !empty($res['status']) ? (int)$res['status'] : 502;
            return new WP_Error('sportmonks_error', $res['error'] ?? 'Sportmonks error', ['status' => $status]);
        }

        $payload = $res['data'];

        if (!empty($league_ids) && isset($payload['data']) && is_array($payload['data'])) {
            $payload['data'] = array_values(array_filter($payload['data'], function($fx) use ($league_ids) {
                $lid = isset($fx['league_id']) ? (int)$fx['league_id'] : 0;
                return $lid && in_array($lid, $league_ids, true);
            }));
        }

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
        // Include options include: participant, details, form. We request details.type so we can map fields.
        if (empty($include)) $include = 'participant;details.type;form';

        $query = ['include' => sanitize_text_field($include)];

        $wp_locale = function_exists('determine_locale') ? determine_locale() : get_locale();
        $sm_locale = strtolower(substr((string)$wp_locale, 0, 2));
        if (!empty($sm_locale) && $sm_locale !== 'en') {
            $query['locale'] = $sm_locale;
        }

        $cache_key = 'ss_std_' . md5($season_id . '|' . json_encode($query));
        if (!empty($s['cache_enabled'])) {
            $cached = Sawah_Sports_Cache::get($cache_key);
            if ($cached) return rest_ensure_response($cached);
        }

        $res = $this->client()->get('standings/seasons/' . rawurlencode((string)$season_id), $query, 15);
        if (!$res['ok']) {
            $status = !empty($res['status']) ? (int)$res['status'] : 502;
            return new WP_Error('sportmonks_error', $res['error'] ?? 'Sportmonks error', ['status' => $status]);
        }

        $payload = $res['data'];
        if (!empty($s['cache_enabled'])) {
            Sawah_Sports_Cache::set($cache_key, $payload, (int)$s['ttl_standings']);
        }
        return rest_ensure_response($payload);
    }
}
