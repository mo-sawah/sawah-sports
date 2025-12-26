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

        // League Selector (Readable)
        $this->add_control('league_select', [
            'label' => __('Select League', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'default' => 'cyprus_first',
            'options' => [
                'cyprus_first' => __('Cyprus 1. Division', 'sawah-sports'),
                'cyprus_cup' => __('Cyprus Cup', 'sawah-sports'),
                'premier_league' => __('Premier League', 'sawah-sports'),
                'champions_league' => __('Champions League', 'sawah-sports'),
                'europa_league' => __('Europa League', 'sawah-sports'),
                'ligue1' => __('Ligue 1', 'sawah-sports'),
                'bundesliga' => __('Bundesliga', 'sawah-sports'),
                'serie_a' => __('Serie A', 'sawah-sports'),
                'la_liga' => __('La Liga', 'sawah-sports'),
                'super_league_greece' => __('Super League (Greece)', 'sawah-sports'),
            ],
            'description' => __('Choose the league for statistics', 'sawah-sports'),
        ]);

        // Season Selector (Readable)
        $this->add_control('season_select', [
            'label' => __('Select Season', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'default' => 'current',
            'options' => [
                'current' => __('2024/25 (Current)', 'sawah-sports'),
                '2023' => __('2023/24', 'sawah-sports'),
                '2022' => __('2022/23', 'sawah-sports'),
            ],
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
        $league = $settings['league_select'] ?? 'cyprus_first';
        $season = $settings['season_select'] ?? 'current';
        $default_tab = $settings['default_tab'] ?? 'dashboard';
        $accent_color = $settings['accent_color'] ?? '#3b82f6';
        
        // Map readable league names to IDs
        $league_map = [
            'cyprus_first' => 253,
            'cyprus_cup' => 259,
            'premier_league' => 8,
            'champions_league' => 2,
            'europa_league' => 5,
            'ligue1' => 301,
            'bundesliga' => 82,
            'serie_a' => 384,
            'la_liga' => 564,
            'super_league_greece' => 325,
        ];
        
        $league_id = $league_map[$league] ?? 253;
        
        // Map seasons to season IDs (you'll need to adjust these)
        $season_map = [
            'current' => 23032, // Cyprus 2024/25 - adjust this
            '2023' => 22032,
            '2022' => 21032,
        ];
        
        $season_id = $season_map[$season] ?? 23032;
        
        // League display names
        $league_names = [
            'cyprus_first' => 'Cyprus 1. Division',
            'cyprus_cup' => 'Cyprus Cup',
            'premier_league' => 'Premier League',
            'champions_league' => 'Champions League',
            'europa_league' => 'Europa League',
            'ligue1' => 'Ligue 1',
            'bundesliga' => 'Bundesliga',
            'serie_a' => 'Serie A',
            'la_liga' => 'La Liga',
            'super_league_greece' => 'Super League',
        ];
        
        $league_name = $league_names[$league] ?? 'Cyprus 1. Division';
        
        wp_enqueue_style('sawah-sports-modern');
        wp_enqueue_script('sawah-sports-modern');

        $id = 'ss-stats-center-' . esc_attr($this->get_id());
        ?>
        <div id="<?php echo $id; ?>" 
             class="ss-stats-center" 
             data-league="<?php echo esc_attr($league_id); ?>"
             data-season="<?php echo esc_attr($season_id); ?>"
             data-league-name="<?php echo esc_attr($league_name); ?>"
             data-default-tab="<?php echo esc_attr($default_tab); ?>"
             style="--stats-accent: <?php echo esc_attr($accent_color); ?>">
            
            <!-- Stats Center Header -->
            <div class="ss-stats-header">
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
        <?php
    }
}
