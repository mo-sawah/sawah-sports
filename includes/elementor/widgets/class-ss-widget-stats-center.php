<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Stats Center Widget - Premier League Style
 * Complete statistics dashboard for Cyprus First Division
 */
class Sawah_Sports_Widget_Stats_Center extends \Elementor\Widget_Base {

    public function get_name() { 
        return 'sawah_sports_stats_center'; 
    }

    public function get_title() { 
        return __('Stats Center', 'sawah-sports'); 
    }

    public function get_icon() { 
        return 'eicon-dashboard'; 
    }

    public function get_categories() { 
        return ['sawah-sport']; 
    }

    public function get_keywords() { 
        return ['football', 'stats', 'statistics', 'center', 'dashboard', 'sawah']; 
    }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Stats Center Settings', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        // Season ID (Simple input)
        $this->add_control('season_id', [
            'label' => __('Season ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 25995,
            'description' => __('Enter the Sportmonks Season ID (e.g., 25995 for Cyprus 2024/25)', 'sawah-sports'),
        ]);

        // League Name
        $this->add_control('league_name', [
            'label' => __('League Name', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'default' => 'Cyprus 1. Division',
            'description' => __('Display name for the league', 'sawah-sports'),
        ]);

        // Default Tab
        $this->add_control('default_tab', [
            'label' => __('Default Tab', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'default' => 'dashboard',
            'options' => [
                'dashboard' => __('Dashboard', 'sawah-sports'),
                'player' => __('Player Stats', 'sawah-sports'),
                'club' => __('Club Stats', 'sawah-sports'),
            ],
        ]);

        $this->end_controls_section();

        // Style Section
        $this->start_controls_section('style', [
            'label' => __('Style', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_STYLE,
        ]);

$this->add_control('theme', [
    'label' => __('Theme', 'sawah-sports'),
    'type' => \Elementor\Controls_Manager::SELECT,
    'default' => 'light',
    'options' => [
        'light' => __('Light (White)', 'sawah-sports'),
        'dark' => __('Dark', 'sawah-sports'),
        'auto' => __('Auto (System)', 'sawah-sports'),
    ],
]);

$this->add_control('density', [
    'label' => __('Layout Density', 'sawah-sports'),
    'type' => \Elementor\Controls_Manager::SELECT,
    'default' => 'compact',
    'options' => [
        'compact' => __('Compact (EPL-like)', 'sawah-sports'),
        'comfortable' => __('Comfortable', 'sawah-sports'),
    ],
]);

$this->add_control('accent_color', [
    'label' => __('Accent Color', 'sawah-sports'),
    'type' => \Elementor\Controls_Manager::COLOR,
    'default' => '#3b82f6',
    'description' => __('Main accent color for the stats center', 'sawah-sports'),
]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $season_id = $settings['season_id'] ?? 25995;
        $league_name = $settings['league_name'] ?? 'Cyprus 1. Division';
        $default_tab = $settings['default_tab'] ?? 'dashboard';
        $accent_color = $settings['accent_color'] ?? '#3b82f6';
        $theme = $settings['theme'] ?? 'light';
        $density = $settings['density'] ?? 'compact';
        
        wp_enqueue_style('sawah-sports-modern');
        wp_enqueue_script('sawah-sports-modern');

        $id = 'ss-stats-center-' . esc_attr($this->get_id());
        ?>
        <div id="<?php echo $id; ?>" 
             class="ss-stats-center ss-theme-<?php echo esc_attr($theme); ?> ss-density-<?php echo esc_attr($density); ?>" 
             data-season="<?php echo esc_attr($season_id); ?>"
             data-league-name="<?php echo esc_attr($league_name); ?>"
             data-default-tab="<?php echo esc_attr($default_tab); ?>"
             style="--stats-accent: <?php echo esc_attr($accent_color); ?>">
            
            <!-- Stats Center Header -->
            <div class="ss-stats-header">
                <div class="ss-stats-header-inner">
                <h1 class="ss-stats-title">Stats Centre</h1>
                
                <!-- Navigation Tabs -->
                <div class="ss-stats-tabs">
                    <button class="ss-stats-tab active" data-tab="dashboard">Dashboard</button>
                    <button class="ss-stats-tab" data-tab="player">Player</button>
                    <button class="ss-stats-tab" data-tab="club">Club</button>
                    <button class="ss-stats-tab" data-tab="all-time">All-time Stats</button>
                    <button class="ss-stats-tab" data-tab="records">Records</button>
                    <button class="ss-stats-tab" data-tab="comparison">Player Comparison</button>
                </div>
            </div>

            <!-- Tab Content Container -->
            <div class="ss-stats-content">
                <div class="ss-stats-content-inner">
                <!-- Dashboard Tab -->
                <div class="ss-stats-tab-content active" data-content="dashboard">
                    <div class="ss-loading">
                        <div class="ss-spinner"></div>
                        <div class="ss-loading-text">Loading statistics...</div>
                    </div>
                </div>

                <!-- Player Tab -->
                <div class="ss-stats-tab-content" data-content="player">
                    <div class="ss-empty">Player stats - coming soon</div>
                </div>

                <!-- Club Tab -->
                <div class="ss-stats-tab-content" data-content="club">
                    <div class="ss-empty">Club stats - coming soon</div>
                </div>

                <!-- All-time Stats Tab -->
                <div class="ss-stats-tab-content" data-content="all-time">
                    <div class="ss-empty">All-time stats - coming soon</div>
                </div>

                <!-- Records Tab -->
                <div class="ss-stats-tab-content" data-content="records">
                    <div class="ss-empty">Records - coming soon</div>
                </div>

                <!-- Player Comparison Tab -->
                <div class="ss-stats-tab-content" data-content="comparison">
                    <div class="ss-empty">Player comparison - coming soon</div>
                </div>
                </div>
            </div>

        </div>
        <?php
    }
}