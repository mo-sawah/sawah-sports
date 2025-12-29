<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Sidebar Standings Widget - Professional Design
 */
class Sawah_Sports_Widget_Standings_Sidebar extends \Elementor\Widget_Base {

    public function get_name() { 
        return 'sawah_sports_standings_sidebar'; 
    }

    public function get_title() { 
        return __('Standings - Sidebar', 'sawah-sports'); 
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
            'default' => 23819,
            'description' => __('Enter Sportmonks Season ID.', 'sawah-sports'),
        ]);

        $this->add_control('title', [
            'label' => __('Widget Title', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'default' => __('Standings', 'sawah-sports'),
            'placeholder' => __('e.g. Premier League', 'sawah-sports'),
        ]);

        $this->add_control('show_teams', [
            'label' => __('Rows to Display', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 10,
            'min' => 1,
            'max' => 50,
            'description' => __('Total number of teams to show in the list.', 'sawah-sports'),
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
            'default' => '#f59e0b',
            'description' => __('Color used for loading spinners and highlights.', 'sawah-sports'),
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $widget_id = $this->get_id();
        ?>
        <div id="ss-standings-sidebar-<?php echo esc_attr($widget_id); ?>" 
             class="ss-widget ss-standings-sidebar"
             data-season-id="<?php echo esc_attr($settings['season_id']); ?>"
             data-show-teams="<?php echo esc_attr($settings['show_teams']); ?>"
             data-accent-color="<?php echo esc_attr($settings['accent_color']); ?>">
            
            <?php if (!empty($settings['title'])) : ?>
            <div class="ss-sidebar-header">
                <h3><?php echo esc_html($settings['title']); ?></h3>
            </div>
            <?php endif; ?>

            <div class="ss-sidebar-table-wrapper">
                <div class="ss-loading">
                    <div class="ss-spinner"></div>
                </div>
            </div>
        </div>
        <?php
    }
}