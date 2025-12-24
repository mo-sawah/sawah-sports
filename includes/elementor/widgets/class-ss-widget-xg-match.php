<?php
if (!defined('ABSPATH')) { exit; }

/**
 * xG Match Widget - Expected Goals Visualization
 * Visual comparison of xG between teams
 */
class Sawah_Sports_Widget_XG_Match extends \Elementor\Widget_Base {

    public function get_name() { 
        return 'sawah_sports_xg_match'; 
    }

    public function get_title() { 
        return __('xG Match Analysis', 'sawah-sports'); 
    }

    public function get_icon() { 
        return 'eicon-stats'; 
    }

    public function get_categories() { 
        return ['sawah-sport']; 
    }

    public function get_keywords() { 
        return ['football', 'xg', 'expected', 'goals', 'statistics', 'sawah']; 
    }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('xG Settings', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('fixture_id', [
            'label' => __('Fixture ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
            'default' => 0,
            'description' => __('Sportmonks fixture ID', 'sawah-sports'),
        ]);

        $this->add_control('show_breakdown', [
            'label' => __('Show Player Breakdown', 'sawah-sports'),
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
            echo '<div class="ss-error">Please configure Fixture ID</div>';
            return;
        }

        $show_breakdown = !empty($settings['show_breakdown']);

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');

        $id = 'ss-xg-match-' . esc_attr($this->get_id());
        ?>
        <div id="<?php echo $id; ?>" 
             class="ss-widget ss-xg-match" 
             data-fixture="<?php echo esc_attr($fixture_id); ?>"
             data-breakdown="<?php echo $show_breakdown ? '1' : '0'; ?>">
            
            <div class="ss-card">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Expected Goals Analysis', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body">
                    <div class="ss-skeleton"></div>
                </div>
            </div>

        </div>
        <?php
    }
}
