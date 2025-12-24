<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Complete Elementor Integration - All 15 Widgets
 * Stage 3: Full widget collection
 */
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
        $elements_manager->add_category('sawah-sport', [
            'title' => __('Sawah Sport', 'sawah-sports'),
            'icon'  => 'fa fa-futbol-o',
        ]);
    }

    public function register_widgets($widgets_manager) {
        // Stage 1: Core widgets
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-live-matches.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-standings.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-league-fixtures.php';
        
        // Stage 2: Advanced widgets
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-match-center.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-xg-match.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-team-profile.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-player-profile.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-odds.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-predictions.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-topscorers.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-h2h.php';
        
        // Stage 3: Premium widgets
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-calendar.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-season-stats.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-match-comparison.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-live-ticker.php';

        // Register all widgets
        $widgets_manager->register(new \Sawah_Sports_Widget_Live_Matches());
        $widgets_manager->register(new \Sawah_Sports_Widget_Standings());
        $widgets_manager->register(new \Sawah_Sports_Widget_League_Fixtures());
        $widgets_manager->register(new \Sawah_Sports_Widget_Match_Center());
        $widgets_manager->register(new \Sawah_Sports_Widget_XG_Match());
        $widgets_manager->register(new \Sawah_Sports_Widget_Team_Profile());
        $widgets_manager->register(new \Sawah_Sports_Widget_Player_Profile());
        $widgets_manager->register(new \Sawah_Sports_Widget_Odds());
        $widgets_manager->register(new \Sawah_Sports_Widget_Predictions());
        $widgets_manager->register(new \Sawah_Sports_Widget_Topscorers());
        $widgets_manager->register(new \Sawah_Sports_Widget_H2H());
        $widgets_manager->register(new \Sawah_Sports_Widget_Calendar());
        $widgets_manager->register(new \Sawah_Sports_Widget_Season_Stats());
        $widgets_manager->register(new \Sawah_Sports_Widget_Match_Comparison());
        $widgets_manager->register(new \Sawah_Sports_Widget_Live_Ticker());
    }

    public function frontend_assets() {
        wp_register_style('sawah-sports', SAWAH_SPORTS_URL . 'assets/css/sawah-sports.css', [], SAWAH_SPORTS_VERSION);
        wp_register_script('sawah-sports-live', SAWAH_SPORTS_URL . 'assets/js/sawah-sports-live.js', [], SAWAH_SPORTS_VERSION, true);

        wp_localize_script('sawah-sports-live', 'SawahSports', [
            'restUrl' => esc_url_raw(rest_url('sawah-sports/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
            'i18n' => [
                'live' => __('LIVE', 'sawah-sports'),
                'team' => __('Team', 'sawah-sports'),
                'form' => __('Form', 'sawah-sports'),
                'goals' => __('Goals', 'sawah-sports'),
                'assists' => __('Assists', 'sawah-sports'),
                'player' => __('Player', 'sawah-sports'),
                'position' => __('Position', 'sawah-sports'),
                'noLive' => __('No live matches right now.', 'sawah-sports'),
                'noFixtures' => __('No fixtures found.', 'sawah-sports'),
                'noStandings' => __('No standings data.', 'sawah-sports'),
                'noData' => __('No data available.', 'sawah-sports'),
                'liveErr' => __('Unable to load live matches.', 'sawah-sports'),
                'fixturesErr' => __('Unable to load fixtures.', 'sawah-sports'),
                'standingsErr' => __('Unable to load standings.', 'sawah-sports'),
                'dataErr' => __('Unable to load data.', 'sawah-sports'),
            ],
        ]);
    }
}
