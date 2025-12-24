<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_League_Fixtures extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_league_fixtures'; }
    public function get_title() { return __('League Fixtures & Results', 'sawah-sports'); }
    public function get_icon() { return 'eicon-calendar'; }
    public function get_categories() { return ['sawah-sport']; }
    public function get_keywords() { return ['football','fixtures','results','league','sportmonks','sawah']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Content', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('league_id', [
            'label' => __('League IDs (comma separated)', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'placeholder' => 'e.g. 564',
        ]);

        $this->add_control('date', [
            'label' => __('Date (YYYY-MM-DD)', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'placeholder' => 'e.g. 2025-12-24',
            'description' => __('Optional. If empty, widget shows today.', 'sawah-sports'),
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $league_id = Sawah_Sports_Helpers::sanitize_int_list($settings['league_id'] ?? '');
        $date = sanitize_text_field($settings['date'] ?? '');

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');

        $id = 'ss-fixtures-' . esc_attr($this->get_id());
        echo '<div id="' . $id . '" class="ss-widget ss-fixtures" data-league="' . esc_attr($league_id) . '" data-date="' . esc_attr($date) . '">';
        echo '<div class="ss-card">';
        echo '<div class="ss-card-head"><div class="ss-title">' . esc_html__('Fixtures & Results', 'sawah-sports') . '</div></div>';
        echo '<div class="ss-body"><div class="ss-skeleton" aria-hidden="true"></div></div>';
        echo '</div>';
        echo '</div>';
    }
}
