<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_Player_Profile extends \Elementor\Widget_Base {
    public function get_name() { return 'sawah_sports_player_profile'; }
    public function get_title() { return __('Player Profile', 'sawah-sports'); }
    public function get_icon() { return 'eicon-user-circle-o'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Player Settings', 'sawah-sports'),
        ]);

        $this->add_control('player_id', [
            'label' => __('Player ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $player_id = (int)($settings['player_id'] ?? 0);
        
        if (!$player_id) {
            echo '<div class="ss-error">Configure Player ID</div>';
            return;
        }

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');
        ?>
        <div class="ss-widget ss-player-profile" data-player="<?php echo esc_attr($player_id); ?>">
            <div class="ss-card">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Player Profile', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body"><div class="ss-skeleton"></div></div>
            </div>
        </div>
        <?php
    }
}
