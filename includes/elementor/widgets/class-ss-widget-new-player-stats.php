<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_New_Player_Stats extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_new_player_stats'; }
    public function get_title() { return __('New Players Stats', 'sawah-sports'); }
    public function get_icon() { return 'eicon-person'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('section_settings', [
            'label' => __('Settings', 'sawah-sports'),
        ]);

        $this->add_control('season_id', [
            'label' => __('Season ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 25996,
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $season_id = (int)$settings['season_id'];

        // Translations for Loco Translate
        $i18n = [
            'goals'    => __('Top scorers', 'sawah-sports'),
            'assists'  => __('Assists', 'sawah-sports'),
            'shots'    => __('Shots on target', 'sawah-sports'),
            'fouls'    => __('Fouls committed', 'sawah-sports'),
            'yellow'   => __('Yellow cards', 'sawah-sports'),
            'red'      => __('Red cards', 'sawah-sports'),
            'no_data'  => __('No data', 'sawah-sports'),
        ];
        ?>
        <div class="ss-nps-wrapper" data-season-id="<?php echo esc_attr($season_id); ?>" data-i18n="<?php echo esc_attr(json_encode($i18n)); ?>">
            <div class="ss-nps-loading"><div class="ss-nps-spinner"></div></div>
            <div class="ss-nps-grid" style="display:none;">
                </div>
        </div>
        <?php
    }
}