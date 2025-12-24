<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Calendar View Widget - Monthly Fixture Calendar
 * Shows fixtures in a calendar grid format
 */
class Sawah_Sports_Widget_Calendar extends \Elementor\Widget_Base {

    public function get_name() { 
        return 'sawah_sports_calendar'; 
    }

    public function get_title() { 
        return __('Fixture Calendar', 'sawah-sports'); 
    }

    public function get_icon() { 
        return 'eicon-calendar'; 
    }

    public function get_categories() { 
        return ['sawah-sport']; 
    }

    public function get_keywords() { 
        return ['football', 'calendar', 'schedule', 'fixtures', 'month', 'sawah']; 
    }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Calendar Settings', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('league_id', [
            'label' => __('League ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
            'description' => __('Filter by league (optional)', 'sawah-sports'),
        ]);

        $this->add_control('team_id', [
            'label' => __('Team ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
            'description' => __('Filter by team (optional)', 'sawah-sports'),
        ]);

        $this->add_control('default_month', [
            'label' => __('Default Month', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'default' => 'current',
            'options' => [
                'current' => __('Current Month', 'sawah-sports'),
                'next' => __('Next Month', 'sawah-sports'),
                'prev' => __('Previous Month', 'sawah-sports'),
            ],
        ]);

        $this->add_control('show_navigation', [
            'label' => __('Show Month Navigation', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $league_id = (int)($settings['league_id'] ?? 0);
        $team_id = (int)($settings['team_id'] ?? 0);
        
        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');

        $id = 'ss-calendar-' . esc_attr($this->get_id());
        ?>
        <div id="<?php echo $id; ?>" 
             class="ss-widget ss-calendar" 
             data-league="<?php echo esc_attr($league_id); ?>"
             data-team="<?php echo esc_attr($team_id); ?>"
             data-month="<?php echo esc_attr($settings['default_month'] ?? 'current'); ?>"
             data-navigation="<?php echo !empty($settings['show_navigation']) ? '1' : '0'; ?>">
            
            <div class="ss-card">
                <?php if (!empty($settings['show_navigation'])): ?>
                <div class="ss-card-head">
                    <button class="ss-calendar-nav ss-nav-prev" aria-label="Previous month">‹</button>
                    <div class="ss-calendar-title"></div>
                    <button class="ss-calendar-nav ss-nav-next" aria-label="Next month">›</button>
                </div>
                <?php endif; ?>
                <div class="ss-body">
                    <div class="ss-skeleton"></div>
                </div>
            </div>

        </div>
        <?php
    }
}
