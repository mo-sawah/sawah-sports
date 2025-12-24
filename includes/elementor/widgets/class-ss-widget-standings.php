<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_Standings extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_standings'; }
    public function get_title() { return __('Standings', 'sawah-sports'); }
    public function get_icon() { return 'eicon-table'; }
    public function get_categories() { return ['sawah-sport']; }
    public function get_keywords() { return ['football','standings','table','sportmonks','sawah']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Content', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('season_id', [
            'label' => __('Season ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
            'default' => 0,
            'description' => __('Required. Sportmonks season id for the league season you want.', 'sawah-sports'),
        ]);

        $this->add_control('show_form', [
            'label' => __('Show form (if available)', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $season_id = (int)($settings['season_id'] ?? 0);
        $show_form = !empty($settings['show_form']) ? '1' : '0';

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');

        $id = 'ss-standings-' . esc_attr($this->get_id());
        echo '<div id="' . $id . '" class="ss-widget ss-standings" data-season="' . esc_attr($season_id) . '" data-show-form="' . esc_attr($show_form) . '">';
        echo '<div class="ss-card">';
        echo '<div class="ss-card-head"><div class="ss-title">' . esc_html__('Standings', 'sawah-sports') . '</div></div>';
        echo '<div class="ss-body"><div class="ss-skeleton" aria-hidden="true"></div></div>';
        echo '</div>';
        echo '</div>';
    }
}
