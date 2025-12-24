<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Match Comparison Widget - Compare Multiple Matches
 */
class Sawah_Sports_Widget_Match_Comparison extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_match_comparison'; }
    public function get_title() { return __('Match Comparison', 'sawah-sports'); }
    public function get_icon() { return 'eicon-columns'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Comparison Settings', 'sawah-sports'),
        ]);

        $this->add_control('fixture_ids', [
            'label' => __('Fixture IDs', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXTAREA,
            'placeholder' => __('Enter fixture IDs separated by commas (e.g., 12345, 67890)', 'sawah-sports'),
            'description' => __('Compare up to 4 matches', 'sawah-sports'),
        ]);

        $this->add_control('compare_type', [
            'label' => __('Compare', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'default' => 'stats',
            'options' => [
                'stats' => __('Statistics', 'sawah-sports'),
                'xg' => __('Expected Goals', 'sawah-sports'),
                'lineups' => __('Lineups', 'sawah-sports'),
            ],
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $fixture_ids = $settings['fixture_ids'] ?? '';
        
        if (empty($fixture_ids)) {
            echo '<div class="ss-error">Enter fixture IDs to compare</div>';
            return;
        }

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');
        ?>
        <div class="ss-widget ss-match-comparison" 
             data-fixtures="<?php echo esc_attr($fixture_ids); ?>"
             data-type="<?php echo esc_attr($settings['compare_type'] ?? 'stats'); ?>">
            <div class="ss-card">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Match Comparison', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body"><div class="ss-skeleton"></div></div>
            </div>
        </div>
        <?php
    }
}
