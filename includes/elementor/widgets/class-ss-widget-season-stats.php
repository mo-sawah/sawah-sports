<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Season Statistics Widget - Complete Season Analytics
 * Shows comprehensive season statistics with charts
 */
class Sawah_Sports_Widget_Season_Stats extends \Elementor\Widget_Base {

    public function get_name() { 
        return 'sawah_sports_season_stats'; 
    }

    public function get_title() { 
        return __('Season Statistics', 'sawah-sports'); 
    }

    public function get_icon() { 
        return 'eicon-dashboard'; 
    }

    public function get_categories() { 
        return ['sawah-sport']; 
    }

    public function get_keywords() { 
        return ['football', 'season', 'statistics', 'analytics', 'charts', 'sawah']; 
    }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Season Settings', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('season_id', [
            'label' => __('Season ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
            'default' => 0,
            'description' => __('Sportmonks season ID', 'sawah-sports'),
        ]);

        $this->add_control('stats_type', [
            'label' => __('Statistics Type', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'default' => 'overview',
            'options' => [
                'overview' => __('Overview', 'sawah-sports'),
                'goals' => __('Goals Analysis', 'sawah-sports'),
                'cards' => __('Cards Statistics', 'sawah-sports'),
                'possession' => __('Possession Stats', 'sawah-sports'),
            ],
        ]);

        $this->add_control('show_charts', [
            'label' => __('Show Charts', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $season_id = (int)($settings['season_id'] ?? 0);
        
        if (!$season_id) {
            echo '<div class="ss-error">Please configure Season ID</div>';
            return;
        }

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');

        $id = 'ss-season-stats-' . esc_attr($this->get_id());
        ?>
        <div id="<?php echo $id; ?>" 
             class="ss-widget ss-season-stats" 
             data-season="<?php echo esc_attr($season_id); ?>"
             data-type="<?php echo esc_attr($settings['stats_type'] ?? 'overview'); ?>"
             data-charts="<?php echo !empty($settings['show_charts']) ? '1' : '0'; ?>">
            
            <div class="ss-card">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Season Statistics', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body">
                    <div class="ss-skeleton"></div>
                </div>
            </div>

        </div>
        <?php
    }
}
