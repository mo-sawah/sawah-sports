<?php
if (!defined('ABSPATH')) { exit; }

final class Sawah_Sports_Admin {
    private static $instance = null;

    public static function instance() {
        if (self::$instance === null) self::$instance = new self();
        return self::$instance;
    }

    private function __construct() {
        add_action('admin_menu', [$this, 'menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'admin_assets']);
        add_action('wp_ajax_sawah_sports_test_connection', [$this, 'ajax_test_connection']);
        add_action('wp_ajax_sawah_sports_clear_cache', [$this, 'ajax_clear_cache']);
    }

    public function menu() {
        add_menu_page(
            __('Sawah Sports', 'sawah-sports'),
            __('Sawah Sports', 'sawah-sports'),
            'manage_options',
            'sawah-sports',
            [$this, 'render_settings_page'],
            'dashicons-shield-alt',
            58
        );
    }

    public function register_settings() {
        register_setting('sawah_sports_settings_group', SAWAH_SPORTS_OPTION_KEY, [
            'type' => 'array',
            'sanitize_callback' => [$this, 'sanitize_settings'],
            'default' => Sawah_Sports_Helpers::settings(),
        ]);

        add_settings_section(
            'ss_main',
            __('Sportmonks Settings', 'sawah-sports'),
            function () {
                echo '<p>' . esc_html__('Add your Sportmonks API token and tune cache settings. The token is stored on the server and is never exposed to visitors.', 'sawah-sports') . '</p>';
            },
            'sawah-sports'
        );

        add_settings_field('api_token', __('API Token', 'sawah-sports'), [$this, 'field_api_token'], 'sawah-sports', 'ss_main');
        add_settings_field('cache_enabled', __('Enable Cache', 'sawah-sports'), [$this, 'field_cache_enabled'], 'sawah-sports', 'ss_main');
        add_settings_field('ttl_live', __('Live TTL (seconds)', 'sawah-sports'), [$this, 'field_ttl_live'], 'sawah-sports', 'ss_main');
        add_settings_field('ttl_fixtures', __('Fixtures TTL (seconds)', 'sawah-sports'), [$this, 'field_ttl_fixtures'], 'sawah-sports', 'ss_main');
        add_settings_field('ttl_standings', __('Standings TTL (seconds)', 'sawah-sports'), [$this, 'field_ttl_standings'], 'sawah-sports', 'ss_main');
        add_settings_field('rate_limit_per_min', __('Rate limit (per minute / IP)', 'sawah-sports'), [$this, 'field_rate_limit'], 'sawah-sports', 'ss_main');
    }

    public function sanitize_settings($input) {
        $out = Sawah_Sports_Helpers::settings();

        $out['api_token'] = isset($input['api_token']) ? sanitize_text_field($input['api_token']) : '';
        $out['cache_enabled'] = isset($input['cache_enabled']) ? (int)!!$input['cache_enabled'] : 0;

        foreach (['ttl_live','ttl_fixtures','ttl_standings','rate_limit_per_min'] as $k) {
            if (isset($input[$k])) {
                $out[$k] = max(1, (int)$input[$k]);
            }
        }

        return $out;
    }

    public function admin_assets($hook) {
        if ($hook !== 'toplevel_page_sawah-sports') return;
        wp_enqueue_style('sawah-sports-admin', SAWAH_SPORTS_URL . 'assets/css/admin.css', [], SAWAH_SPORTS_VERSION);
        wp_enqueue_script('sawah-sports-admin', SAWAH_SPORTS_URL . 'assets/js/admin.js', ['jquery'], SAWAH_SPORTS_VERSION, true);
        wp_localize_script('sawah-sports-admin', 'SawahSportsAdmin', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('sawah_sports_admin'),
        ]);
    }

    public function field_api_token() {
        $s = Sawah_Sports_Helpers::settings();
        printf(
            '<input type="password" class="regular-text" name="%s[api_token]" value="%s" autocomplete="off" />',
            esc_attr(SAWAH_SPORTS_OPTION_KEY),
            esc_attr($s['api_token'])
        );
        echo '<p class="description">' . esc_html__('Get your token from Sportmonks. You can authenticate using api_token query parameter or header; we use query parameter.', 'sawah-sports') . '</p>';
        echo '<p><button type="button" class="button" id="ss-test-connection">' . esc_html__('Test Connection', 'sawah-sports') . '</button> <span id="ss-test-result"></span></p>';
    }

    public function field_cache_enabled() {
        $s = Sawah_Sports_Helpers::settings();
        printf(
            '<label><input type="checkbox" name="%s[cache_enabled]" value="1" %s /> %s</label>',
            esc_attr(SAWAH_SPORTS_OPTION_KEY),
            checked(!empty($s['cache_enabled']), true, false),
            esc_html__('Recommended: keeps pages fast and protects API limits.', 'sawah-sports')
        );
        echo '<p><button type="button" class="button" id="ss-clear-cache">' . esc_html__('Clear Sawah Sports Cache', 'sawah-sports') . '</button> <span id="ss-clear-result"></span></p>';
    }

    public function field_ttl_live() { $this->field_number('ttl_live', 5, 120); }
    public function field_ttl_fixtures() { $this->field_number('ttl_fixtures', 60, 3600); }
    public function field_ttl_standings() { $this->field_number('ttl_standings', 300, 86400); }
    public function field_rate_limit() { $this->field_number('rate_limit_per_min', 10, 600); }

    private function field_number(string $key, int $min, int $max) {
        $s = Sawah_Sports_Helpers::settings();
        printf(
            '<input type="number" min="%d" max="%d" name="%s[%s]" value="%d" />',
            $min, $max,
            esc_attr(SAWAH_SPORTS_OPTION_KEY),
            esc_attr($key),
            (int)$s[$key]
        );
    }

    public function render_settings_page() {
        if (!current_user_can('manage_options')) return;
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('Sawah Sports Settings', 'sawah-sports') . '</h1>';
        echo '<div class="ss-admin-card">';
        echo '<form method="post" action="options.php">';
        settings_fields('sawah_sports_settings_group');
        do_settings_sections('sawah-sports');
        submit_button();
        echo '</form>';
        echo '</div>';

        echo '<div class="ss-admin-help">';
        echo '<h2>' . esc_html__('Next step', 'sawah-sports') . '</h2>';
        echo '<p>' . esc_html__('Go to Elementor editor → search for "Sawah" → add the widgets under the "Sawah Sport" category.', 'sawah-sports') . '</p>';
        echo '</div>';

        echo '</div>';
    }

    public function ajax_test_connection() {
        if (!current_user_can('manage_options')) wp_send_json_error(['message' => 'forbidden'], 403);
        check_ajax_referer('sawah_sports_admin', 'nonce');

        $s = Sawah_Sports_Helpers::settings();
        $client = new Sawah_Sports_API_Client((string)$s['api_token']);

        // Lightweight request.
        $res = $client->get('leagues', ['per_page' => 1], 12);

        if (!$res['ok']) {
            wp_send_json_error(['message' => $res['error'] ?? 'error', 'status' => $res['status'] ?? 0]);
        }

        wp_send_json_success(['message' => 'OK', 'status' => $res['status']]);
    }

    public function ajax_clear_cache() {
        if (!current_user_can('manage_options')) wp_send_json_error(['message' => 'forbidden'], 403);
        check_ajax_referer('sawah_sports_admin', 'nonce');
        Sawah_Sports_Cache::delete_prefix('ss_');
        wp_send_json_success(['message' => 'cleared']);
    }
}
