<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Live Ticker Widget - Real-time Match Updates
 */
class Sawah_Sports_Widget_Live_Ticker extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_live_ticker'; }
    public function get_title() { return __('Live Match Ticker', 'sawah-sports'); }
    public function get_icon() { return 'eicon-post-list'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Ticker Settings', 'sawah-sports'),
        ]);

        $this->add_control('fixture_id', [
            'label' => __('Fixture ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
        ]);

        $this->add_control('auto_scroll', [
            'label' => __('Auto Scroll', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->add_control('max_events', [
            'label' => __('Maximum Events', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 10,
            'max' => 100,
            'default' => 50,
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
        <div class="ss-widget ss-live-ticker" 
             data-fixture="<?php echo esc_attr($fixture_id); ?>"
             data-autoscroll="<?php echo !empty($settings['auto_scroll']) ? '1' : '0'; ?>"
             data-max="<?php echo esc_attr($settings['max_events'] ?? 50); ?>">
            <div class="ss-card">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Live Match Updates', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body ss-ticker-body"><div class="ss-skeleton"></div></div>
            </div>
        </div>
        <?php
    }
}
