<?php
if (!defined('ABSPATH')) { exit; }

final class Sawah_Sports_Elementor {
    private static $instance = null;

    public static function instance() {
        if (self::$instance === null) self::$instance = new self();
        return self::$instance;
    }

    private function __construct() {
        add_action('elementor/elements/categories_registered', [$this, 'register_category']);
        add_action('elementor/widgets/register', [$this, 'register_widgets']);
        add_action('wp_enqueue_scripts', [$this, 'frontend_assets']);
    }

    public function register_category($elements_manager) {
        $elements_manager->add_category(
            'sawah-sport',
            [
                'title' => __('Sawah Sport', 'sawah-sports'),
                'icon'  => 'fa fa-futbol-o',
            ]
        );
    }

    public function register_widgets($widgets_manager) {
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-live-matches.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-standings.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-league-fixtures.php';

        $widgets_manager->register(new \Sawah_Sports_Widget_Live_Matches());
        $widgets_manager->register(new \Sawah_Sports_Widget_Standings());
        $widgets_manager->register(new \Sawah_Sports_Widget_League_Fixtures());
    }

    public function frontend_assets() {
        wp_register_style('sawah-sports', SAWAH_SPORTS_URL . 'assets/css/sawah-sports.css', [], SAWAH_SPORTS_VERSION);
        wp_register_script('sawah-sports-live', SAWAH_SPORTS_URL . 'assets/js/sawah-sports-live.js', [], SAWAH_SPORTS_VERSION, true);

        wp_localize_script('sawah-sports-live', 'SawahSports', [
            'restUrl' => esc_url_raw(rest_url('sawah-sports/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
        ]);
    }
}
