<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_Predictions extends \Elementor\Widget_Base {
    public function get_name() { return 'sawah_sports_predictions'; }
    public function get_title() { return __('Match Predictions', 'sawah-sports'); }
    public function get_icon() { return 'eicon-lightbox'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Prediction Settings', 'sawah-sports'),
        ]);

        $this->add_control('fixture_id', [
            'label' => __('Fixture ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
        ]);

        $this->add_control('show_valuebets', [
            'label' => __('Show Value Bets', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $fixture_id = (int)($settings['fixture_id'] ?? 0);
        
        if (!$fixture_id) {
            echo '<div class="ss-error">Configure Fixture ID</div>';
            return;
        }

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');
        ?>
        <div class="ss-widget ss-predictions" 
             data-fixture="<?php echo esc_attr($fixture_id); ?>"
             data-valuebets="<?php echo !empty($settings['show_valuebets']) ? '1' : '0'; ?>">
            <div class="ss-card">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('AI Predictions', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body"><div class="ss-skeleton"></div></div>
            </div>
        </div>
        <?php
    }
}
