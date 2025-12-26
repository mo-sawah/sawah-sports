<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Premium Standings Widget - Sofascore Style
 * Features: Home/Away tabs, Form display, Goal stats, Champions League zones
 */
class Sawah_Sports_Widget_Standings_Premium extends \Elementor\Widget_Base {

    public function get_name() { 
        return 'sawah_sports_standings_premium'; 
    }

    public function get_title() { 
        return __('Standings (Premium)', 'sawah-sports'); 
    }

    public function get_icon() { 
        return 'eicon-table'; 
    }

    public function get_categories() { 
        return ['sawah-sport']; 
    }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Settings', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('season_id', [
            'label' => __('Season ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 23819, // 2024/25 Premier League
            'description' => __('Enter Sportmonks Season ID (e.g., 23819 for EPL 2024/25, 19914 for Cyprus First Division 2024/25)', 'sawah-sports'),
        ]);

        $this->add_control('title', [
            'label' => __('Widget Title', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'default' => __('Standings', 'sawah-sports'),
        ]);

        $this->add_control('show_rules', [
            'label' => __('Show Rules Section', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'default' => 'yes',
            'description' => __('Display tie-breaking rules at bottom', 'sawah-sports'),
        ]);

        $this->add_control('show_form', [
            'label' => __('Show Form (Last 5)', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'default' => 'yes',
        ]);

        $this->add_control('form_count', [
            'label' => __('Form Matches Count', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 5,
            'min' => 3,
            'max' => 10,
            'condition' => ['show_form' => 'yes'],
        ]);

        $this->add_control('highlight_zones', [
            'label' => __('Highlight Qualification Zones', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'default' => 'yes',
            'description' => __('Color-code positions (Champions League, Europa, Relegation)', 'sawah-sports'),
        ]);

        $this->end_controls_section();

        // Zone Configuration Section
        $this->start_controls_section('zones', [
            'label' => __('Qualification Zones', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            'condition' => ['highlight_zones' => 'yes'],
        ]);

        $this->add_control('cl_positions', [
            'label' => __('Champions League Positions', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'default' => '1,2,3,4',
            'description' => __('Comma-separated positions (e.g., 1,2,3,4)', 'sawah-sports'),
        ]);

        $this->add_control('el_positions', [
            'label' => __('Europa League Positions', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'default' => '5,6',
            'description' => __('Comma-separated positions', 'sawah-sports'),
        ]);

        $this->add_control('ecl_positions', [
            'label' => __('Conference League Positions', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'default' => '7',
            'description' => __('Comma-separated positions', 'sawah-sports'),
        ]);

        $this->add_control('rel_positions', [
            'label' => __('Relegation Positions', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'default' => '18,19,20',
            'description' => __('Comma-separated positions', 'sawah-sports'),
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $widget_id = $this->get_id();
        ?>
        <div id="ss-standings-<?php echo esc_attr($widget_id); ?>" 
             class="ss-widget ss-standings-premium"
             data-season-id="<?php echo esc_attr($settings['season_id']); ?>"
             data-show-form="<?php echo esc_attr($settings['show_form']); ?>"
             data-form-count="<?php echo esc_attr($settings['form_count']); ?>"
             data-highlight-zones="<?php echo esc_attr($settings['highlight_zones']); ?>"
             data-cl-positions="<?php echo esc_attr($settings['cl_positions']); ?>"
             data-el-positions="<?php echo esc_attr($settings['el_positions']); ?>"
             data-ecl-positions="<?php echo esc_attr($settings['ecl_positions']); ?>"
             data-rel-positions="<?php echo esc_attr($settings['rel_positions']); ?>">
            
            <div class="ss-standings-content">
                <?php if (!empty($settings['title'])) : ?>
                <div class="ss-widget-header">
                    <h2><?php echo esc_html($settings['title']); ?></h2>
                </div>
                <?php endif; ?>

                <!-- Home/Away Tabs -->
                <div class="ss-standings-tabs">
                    <button class="ss-standings-tab active" data-type="all">
                        <?php echo esc_html__('All', 'sawah-sports'); ?>
                    </button>
                    <button class="ss-standings-tab" data-type="home">
                        <?php echo esc_html__('Home', 'sawah-sports'); ?>
                    </button>
                    <button class="ss-standings-tab" data-type="away">
                        <?php echo esc_html__('Away', 'sawah-sports'); ?>
                    </button>
                </div>

                <!-- Standings Table -->
                <div class="ss-standings-table-wrapper">
                    <div class="ss-loading">
                        <div class="ss-spinner"></div>
                    </div>
                </div>

                <?php if ($settings['show_rules'] === 'yes') : ?>
                <!-- Rules Section -->
                <div class="ss-standings-rules">
                    <div class="ss-rules-header">
                        <h3><?php echo esc_html__('Rules', 'sawah-sports'); ?></h3>
                        <i class="eicon-chevron-down"></i>
                    </div>
                    <div class="ss-rules-content" style="display: none;">
                        <div class="ss-rules-legend">
                            <?php if ($settings['highlight_zones'] === 'yes') : ?>
                            <div class="ss-rule-item">
                                <span class="ss-rule-badge ss-cl"></span>
                                <span><?php echo esc_html__('Champions League', 'sawah-sports'); ?></span>
                            </div>
                            <div class="ss-rule-item">
                                <span class="ss-rule-badge ss-el"></span>
                                <span><?php echo esc_html__('UEFA Europa League', 'sawah-sports'); ?></span>
                            </div>
                            <div class="ss-rule-item">
                                <span class="ss-rule-badge ss-ecl"></span>
                                <span><?php echo esc_html__('UEFA Conference League', 'sawah-sports'); ?></span>
                            </div>
                            <div class="ss-rule-item">
                                <span class="ss-rule-badge ss-rel"></span>
                                <span><?php echo esc_html__('Relegation', 'sawah-sports'); ?></span>
                            </div>
                            <?php endif; ?>
                        </div>
                        <p class="ss-rules-text">
                            <?php echo esc_html__('In the event that two (or more) teams have an equal number of points, the following rules break the tie: 1. Goal difference 2. Goals scored 3. H2H', 'sawah-sports'); ?>
                        </p>
                    </div>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
}