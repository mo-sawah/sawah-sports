<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Today's Matches Widget - Premium Design with Date Navigation
 */
class Sawah_Sports_Widget_Todays_Matches extends \Elementor\Widget_Base {

    public function get_name() {
        return 'ss_todays_matches';
    }

    public function get_title() {
        return __('Today\'s Matches', 'sawah-sports');
    }

    public function get_icon() {
        return 'eicon-post-list';
    }

    public function get_categories() {
        return ['sawah-sport'];
    }

    protected function register_controls() {
        $this->start_controls_section(
            'content_section',
            [
                'label' => __('Settings', 'sawah-sports'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'auto_refresh',
            [
                'label' => __('Auto Refresh (seconds)', 'sawah-sports'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 30,
                'min' => 0,
                'max' => 300,
                'description' => __('Set to 0 to disable auto-refresh', 'sawah-sports'),
            ]
        );
        
        $this->add_control(
            'league_filter',
            [
                'label' => __('League ID Filter (optional)', 'sawah-sports'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'placeholder' => '570',
                'description' => __('Filter matches by league ID (e.g., 570 for Cyprus First Division)', 'sawah-sports'),
            ]
        );

        $this->end_controls_section();
        
        // Style section
        $this->start_controls_section(
            'style_section',
            [
                'label' => __('Style', 'sawah-sports'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'theme',
            [
                'label' => __('Theme', 'sawah-sports'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'dark',
                'options' => [
                    'dark' => __('Dark', 'sawah-sports'),
                    'light' => __('Light', 'sawah-sports'),
                ],
            ]
        );

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $refresh = (int)$settings['auto_refresh'];
        $league = esc_attr($settings['league_filter'] ?? '');
        $theme = esc_attr($settings['theme'] ?? 'dark');
        
        ?>
        <div class="ss-widget ss-todays-matches <?php echo $theme === 'light' ? 'ss-light' : ''; ?>" 
             data-refresh="<?php echo $refresh; ?>"
             data-league="<?php echo $league; ?>">
            <div class="ss-header">
                <!-- Date navigation will be inserted by JavaScript -->
            </div>
            <div class="ss-body">
                <!-- Matches will be loaded by JavaScript -->
            </div>
        </div>
        <?php
    }
}
