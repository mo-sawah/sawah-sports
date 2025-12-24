<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_Topscorers extends \Elementor\Widget_Base {
    public function get_name() { return 'sawah_sports_topscorers'; }
    public function get_title() { return __('Top Scorers', 'sawah-sports'); }
    public function get_icon() { return 'eicon-trophy'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Top Scorers Settings', 'sawah-sports'),
        ]);

        $this->add_control('season_id', [
            'label' => __('Season ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
        ]);

        $this->add_control('type', [
            'label' => __('Type', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'default' => 'goals',
            'options' => [
                'goals' => __('Goals', 'sawah-sports'),
                'assists' => __('Assists', 'sawah-sports'),
                'cards' => __('Cards', 'sawah-sports'),
            ],
        ]);

        $this->add_control('limit', [
            'label' => __('Show Top', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 5,
            'max' => 50,
            'default' => 10,
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $season_id = (int)($settings['season_id'] ?? 0);
        
        if (!$season_id) {
            echo '<div class="ss-error">Configure Season ID</div>';
            return;
        }

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');
        ?>
        <div class="ss-widget ss-topscorers" 
             data-season="<?php echo esc_attr($season_id); ?>"
             data-type="<?php echo esc_attr($settings['type'] ?? 'goals'); ?>"
             data-limit="<?php echo esc_attr($settings['limit'] ?? 10); ?>">
            <div class="ss-card">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Top Scorers', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body"><div class="ss-skeleton"></div></div>
            </div>
        </div>
        <?php
    }
}
