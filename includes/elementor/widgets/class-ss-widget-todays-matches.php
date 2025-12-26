<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Today's Matches Widget - Premium "Koora" Style
 * Features: Date Slider, Search, Live Toggle, Custom League Priority
 */
class Sawah_Sports_Widget_Todays_Matches extends \Elementor\Widget_Base {

    public function get_name() { 
        return 'sawah_sports_todays_matches'; 
    }

    public function get_title() { 
        return __('Today\'s Matches (Premium)', 'sawah-sports'); 
    }

    public function get_icon() { 
        return 'eicon-gallery-grid'; 
    }

    public function get_categories() { 
        return ['sawah-sport']; 
    }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Settings', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('title', [
            'label' => __('Widget Title', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'default' => __('Matches & Results', 'sawah-sports'),
        ]);

        $this->add_control('priority_mode', [
            'label' => __('Sorting Priority', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'default' => 'custom',
            'options' => [
                'custom' => __('Custom (Cyprus > EU > Big 5)', 'sawah-sports'),
                'time' => __('Time (Chronological)', 'sawah-sports'),
            ],
            'description' => __('Custom sorting prioritizes Cyprus, Champions League, EPL, La Liga, etc.', 'sawah-sports'),
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $widget_id = $this->get_id();
        
        // Pass priorities to frontend via data attributes if needed, 
        // but for now we will hardcode the specific ID map in JS for performance.
        ?>
        <div id="ss-matches-<?php echo esc_attr($widget_id); ?>" 
             class="ss-widget ss-todays-matches-premium"
             data-priority-mode="<?php echo esc_attr($settings['priority_mode']); ?>">
            
            <?php if (!empty($settings['title'])) : ?>
                <div class="ss-widget-header">
                    <h2><?php echo esc_html($settings['title']); ?></h2>
                </div>
            <?php endif; ?>

            <div class="ss-date-slider-wrapper">
                <button class="ss-date-nav-btn ss-prev" aria-label="Previous">
                    <i class="eicon-chevron-left"></i>
                </button>
                <div class="ss-date-slider">
                    </div>
                <button class="ss-date-nav-btn ss-next" aria-label="Next">
                    <i class="eicon-chevron-right"></i>
                </button>
                <div class="ss-date-picker-trigger">
                    <i class="eicon-calendar"></i>
                    <input type="date" class="ss-date-input-hidden">
                </div>
            </div>

            <div class="ss-filter-bar">
                <div class="ss-filter-buttons">
                    <button class="ss-filter-btn active" data-filter="all">
                        <?php echo esc_html__('All', 'sawah-sports'); ?>
                    </button>
                    <button class="ss-filter-btn" data-filter="live">
                        <?php echo esc_html__('Live', 'sawah-sports'); ?> 
                        <span class="ss-live-count">(0)</span>
                    </button>
                </div>
                <div class="ss-search-wrapper">
                    <i class="eicon-search"></i>
                    <input type="text" class="ss-match-search" placeholder="<?php echo esc_attr__('Search matches...', 'sawah-sports'); ?>">
                </div>
            </div>

            <div class="ss-body ss-matches-list-wrapper">
                <div class="ss-loading">
                    <div class="ss-spinner"></div>
                </div>
            </div>
        </div>
        <?php
    }
}