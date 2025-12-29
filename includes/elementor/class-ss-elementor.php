<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Complete Elementor Integration - v6.0 Mobile Optimized
 * Added "watch" i18n for button text
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
        // v5.0: Stats Center - Premier League Style
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-stats-center.php';
        
        // v4.0: Premium Today's Matches widget
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-todays-matches.php';
        
        // Stage 1: Core widgets
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-live-matches.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-standings.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-standings-premium.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-league-fixtures.php';
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-mobile-matches.php';
        
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

        // v7.0: League Hub (SofaScore-style page)
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-league-hub.php';

        // v8.0: Goal.com Style Matches (Greek/Cyprus Priority)
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-goal-style-matches.php';

        // v9.0: Sidebar Standings (Compact)
        require_once SAWAH_SPORTS_PATH . 'includes/elementor/widgets/class-ss-widget-standings-sidebar.php';

        // Register all widgets
        $widgets_manager->register(new \Sawah_Sports_Widget_Stats_Center()); // v5.0 Stats Center
        $widgets_manager->register(new \Sawah_Sports_Widget_Todays_Matches()); // v4.0 Premium
        $widgets_manager->register(new \Sawah_Sports_Widget_Live_Matches());
        $widgets_manager->register(new \Sawah_Sports_Widget_Standings());
        $widgets_manager->register(new \Sawah_Sports_Widget_Standings_Premium());
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
        $widgets_manager->register(new \Sawah_Sports_Widget_Mobile_Matches());
        $widgets_manager->register(new \Sawah_Sports_Widget_League_Hub()); // v7.0 League Hub
        $widgets_manager->register(new \Sawah_Sports_Widget_Goal_Style_Matches()); // v8.0 Goal.com Style
        $widgets_manager->register(new \Sawah_Sports_Widget_Standings_Sidebar()); // v9.0 Sidebar Standings
    }

    public function frontend_assets() {
        // v6.0: Mobile-optimized design
        wp_enqueue_style('sawah-sports-modern', SAWAH_SPORTS_URL . 'assets/css/sawah-sports-modern.css', [], SAWAH_SPORTS_VERSION);
        
        // TV Channels CSS - Mobile Optimized
        wp_enqueue_style('sawah-sports-tv-channels', SAWAH_SPORTS_URL . 'assets/css/tv-channels.css', ['sawah-sports-modern'], SAWAH_SPORTS_VERSION);
        
        // Premium Standings CSS
        wp_enqueue_style('sawah-sports-standings', SAWAH_SPORTS_URL . 'assets/css/sawah-standings.css', ['sawah-sports-modern'], SAWAH_SPORTS_VERSION);
        
        wp_enqueue_script('sawah-sports-modern', SAWAH_SPORTS_URL . 'assets/js/sawah-sports-modern.js', [], SAWAH_SPORTS_VERSION, true);

        // Matches Widget Script with TV Channels support
        wp_enqueue_script('sawah-matches-widget', SAWAH_SPORTS_URL . 'assets/js/sawah-todays-matches.js', ['jquery', 'sawah-sports-modern'], SAWAH_SPORTS_VERSION, true);

        // Mobile widget CSS
        wp_enqueue_style(
            'sawah-mobile-matches', 
            SAWAH_SPORTS_URL . 'assets/css/sawah-mobile-matches.css', 
            [], 
            SAWAH_SPORTS_VERSION
        );

        // Mobile widget JS
        wp_enqueue_script(
            'sawah-mobile-matches', 
            SAWAH_SPORTS_URL . 'assets/js/sawah-mobile-matches.js', 
            ['jquery'], 
            SAWAH_SPORTS_VERSION, 
            true
        );

        // Premium Standings JS
        wp_enqueue_script(
            'sawah-standings', 
            SAWAH_SPORTS_URL . 'assets/js/sawah-standings.js', 
            ['jquery', 'sawah-sports-modern'], 
            SAWAH_SPORTS_VERSION, 
            true
        );

        // League Hub (SofaScore-style) assets
        wp_enqueue_style(
            'sawah-league-hub',
            SAWAH_SPORTS_URL . 'assets/css/sawah-league-hub.css',
            ['sawah-sports-modern'],
            SAWAH_SPORTS_VERSION
        );

        wp_enqueue_script(
            'sawah-league-hub',
            SAWAH_SPORTS_URL . 'assets/js/sawah-league-hub.js',
            ['jquery', 'sawah-sports-modern'],
            SAWAH_SPORTS_VERSION,
            true
        );

        // Goal.com Style Matches (v8.0) - Greek/Cyprus Priority
        wp_enqueue_style(
            'sawah-goal-matches',
            SAWAH_SPORTS_URL . 'assets/css/goal-style-matches.css',
            ['sawah-sports-modern'],
            SAWAH_SPORTS_VERSION
        );

        wp_enqueue_script(
            'sawah-goal-matches',
            SAWAH_SPORTS_URL . 'assets/js/goal-style-matches.js',
            ['jquery', 'sawah-sports-modern'],
            SAWAH_SPORTS_VERSION,
            true
        );

        // Sidebar Standings (v9.0) - Compact for sidebars
        wp_enqueue_style(
            'sawah-standings-sidebar',
            SAWAH_SPORTS_URL . 'assets/css/standings-sidebar.css',
            ['sawah-sports-modern'],
            SAWAH_SPORTS_VERSION
        );

        wp_enqueue_script(
            'sawah-standings-sidebar',
            SAWAH_SPORTS_URL . 'assets/js/standings-sidebar.js',
            ['jquery', 'sawah-sports-modern'],
            SAWAH_SPORTS_VERSION,
            true
        );

        wp_localize_script('sawah-sports-modern', 'SawahSports', [
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
                
                // v6.0: TV Channels/Streaming i18n - UPDATED
                'watch' => __('Watch', 'sawah-sports'), // Changed from "Watch Live" to just "Watch"
                'watchLive' => __('Watch Live', 'sawah-sports'), // Keep for backwards compatibility
                'availableOn' => __('Available on', 'sawah-sports'),
                'moreChannels' => __('more channels', 'sawah-sports'),
                'streamingOn' => __('Streaming on', 'sawah-sports'),
                'broadcastOn' => __('Broadcast on', 'sawah-sports'),
                
                // v9.0: Sidebar Standings i18n
                'more' => __('More', 'sawah-sports'),
                'less' => __('Less', 'sawah-sports'),
            ],
        ]);
    }
}