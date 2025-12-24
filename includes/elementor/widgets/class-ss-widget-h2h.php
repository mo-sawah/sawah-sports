<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_H2H extends \Elementor\Widget_Base {
    public function get_name() { return 'sawah_sports_h2h'; }
    public function get_title() { return __('Head-to-Head', 'sawah-sports'); }
    public function get_icon() { return 'eicon-exchange'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('H2H Settings', 'sawah-sports'),
        ]);

        $this->add_control('team1_id', [
            'label' => __('Team 1 ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
        ]);

        $this->add_control('team2_id', [
            'label' => __('Team 2 ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
        ]);

        $this->add_control('limit', [
            'label' => __('Show Last Matches', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 5,
            'max' => 20,
            'default' => 10,
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $team1_id = (int)($settings['team1_id'] ?? 0);
        $team2_id = (int)($settings['team2_id'] ?? 0);
        
        if (!$team1_id || !$team2_id) {
            echo '<div class="ss-error">Configure both Team IDs</div>';
            return;
        }

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');
        ?>
        <div class="ss-widget ss-h2h" 
             data-team1="<?php echo esc_attr($team1_id); ?>"
             data-team2="<?php echo esc_attr($team2_id); ?>"
             data-limit="<?php echo esc_attr($settings['limit'] ?? 10); ?>">
            <div class="ss-card">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Head-to-Head', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body"><div class="ss-skeleton"></div></div>
            </div>
        </div>
        <?php
    }
}
