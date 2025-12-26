<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Mobile-Only Today's Matches Widget
 * Vertical layout for mobile devices
 * Use this widget ONLY on mobile, use regular widget on desktop
 */
class Sawah_Sports_Widget_Mobile_Matches extends \Elementor\Widget_Base {

    public function get_name() { 
        return 'sawah_sports_mobile_matches'; 
    }

    public function get_title() { 
        return __('Today\'s Matches (Mobile Only)', 'sawah-sports'); 
    }

    public function get_icon() { 
        return 'eicon-device-mobile'; 
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

        $this->add_control('mobile_notice', [
            'type' => \Elementor\Controls_Manager::RAW_HTML,
            'raw' => '<div style="padding:10px; background:#fff3cd; border-radius:4px; color:#856404;">
                <strong>⚠️ Mobile Only Widget</strong><br>
                This widget is designed for mobile devices only. Use the regular "Today\'s Matches" widget for desktop.
            </div>',
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $widget_id = $this->get_id();
        ?>
        <div id="ssm-<?php echo esc_attr($widget_id); ?>" class="ss-mobile-matches">
            
            <?php if (!empty($settings['title'])) : ?>
                <div class="ssm-header">
                    <h2><?php echo esc_html($settings['title']); ?></h2>
                </div>
            <?php endif; ?>

            <!-- Date Slider -->
            <div class="ssm-date-wrapper">
                <button class="ssm-prev" aria-label="Previous">
                    <i class="eicon-chevron-left"></i>
                </button>
                <div class="ssm-date-slider"></div>
                <button class="ssm-next" aria-label="Next">
                    <i class="eicon-chevron-right"></i>
                </button>
                <div class="ssm-calendar-btn">
                    <i class="eicon-calendar"></i>
                    <input type="date" class="ssm-date-input">
                </div>
            </div>

            <!-- Search Bar -->
            <div class="ssm-search-wrapper">
                <i class="eicon-search"></i>
                <input type="text" class="ssm-match-search" placeholder="<?php echo esc_attr__('Search matches...', 'sawah-sports'); ?>">
            </div>

            <!-- Filter Buttons -->
            <div class="ssm-filter-bar">
                <button class="ssm-filter-btn active" data-filter="all">
                    <?php echo esc_html__('All', 'sawah-sports'); ?>
                </button>
                <button class="ssm-filter-btn" data-filter="live">
                    <?php echo esc_html__('Live', 'sawah-sports'); ?> 
                    <span class="ssm-live-count">(0)</span>
                </button>
            </div>

            <!-- Matches -->
            <div class="ssm-matches-wrapper">
                <div class="ssm-loading">
                    <div class="ssm-spinner"></div>
                </div>
            </div>
        </div>
        <?php
    }
}