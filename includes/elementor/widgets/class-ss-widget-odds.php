<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_Odds extends \Elementor\Widget_Base {
    public function get_name() { return 'sawah_sports_odds'; }
    public function get_title() { return __('Match Odds', 'sawah-sports'); }
    public function get_icon() { return 'eicon-price-table'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Odds Settings', 'sawah-sports'),
        ]);

        $this->add_control('fixture_id', [
            'label' => __('Fixture ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
        ]);

        $this->add_control('market', [
            'label' => __('Market Type', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'default' => '1x2',
            'options' => [
                '1x2' => __('1X2', 'sawah-sports'),
                'ou' => __('Over/Under', 'sawah-sports'),
                'btts' => __('Both Teams to Score', 'sawah-sports'),
            ],
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
        <div class="ss-widget ss-odds" 
             data-fixture="<?php echo esc_attr($fixture_id); ?>"
             data-market="<?php echo esc_attr($settings['market'] ?? '1x2'); ?>">
            <div class="ss-card">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Match Odds', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body"><div class="ss-skeleton"></div></div>
            </div>
        </div>
        <?php
    }
}
