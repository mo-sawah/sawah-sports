<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_Live_Matches extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_live_matches'; }
    public function get_title() { return __('Live Matches', 'sawah-sports'); }
    public function get_icon() { return 'eicon-play'; }
    public function get_categories() { return ['sawah-sport']; }
    public function get_keywords() { return ['football','livescore','sportmonks','sawah']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Content', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('league_id', [
            'label' => __('League IDs (comma separated)', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'placeholder' => 'e.g. 8, 564',
            'description' => __('Optional. Leave empty for all in-play matches (may be heavy).', 'sawah-sports'),
        ]);

        $this->add_control('refresh', [
            'label' => __('Auto refresh (seconds)', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 5,
            'max' => 120,
            'default' => 20,
        ]);

        $this->end_controls_section();

        $this->start_controls_section('style', [
            'label' => __('Style', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_STYLE,
        ]);

        $this->add_control('compact', [
            'label' => __('Compact mode', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => '',
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $league_id = Sawah_Sports_Helpers::sanitize_int_list($settings['league_id'] ?? '');
        $refresh = max(5, (int)($settings['refresh'] ?? 20));
        $compact = !empty($settings['compact']) ? '1' : '0';

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');

        $id = 'ss-live-' . esc_attr($this->get_id());
        echo '<div id="' . $id . '" class="ss-widget ss-live" data-league="' . esc_attr($league_id) . '" data-refresh="' . esc_attr($refresh) . '" data-compact="' . esc_attr($compact) . '">';
        echo '<div class="ss-card">';
        echo '<div class="ss-card-head"><div class="ss-title">' . esc_html__('Live Matches', 'sawah-sports') . '</div><div class="ss-badge ss-badge-live"><span class="ss-pulse"></span>' . esc_html__('LIVE', 'sawah-sports') . '</div></div>';
        echo '<div class="ss-body"><div class="ss-skeleton" aria-hidden="true"></div></div>';
        echo '</div>';
        echo '</div>';
    }
}
