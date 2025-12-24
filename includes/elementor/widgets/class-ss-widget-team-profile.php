<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Team Profile Widget - Complete Team Information
 */
class Sawah_Sports_Widget_Team_Profile extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_team_profile'; }
    public function get_title() { return __('Team Profile', 'sawah-sports'); }
    public function get_icon() { return 'eicon-person'; }
    public function get_categories() { return ['sawah-sport']; }
    public function get_keywords() { return ['football', 'team', 'profile', 'stats', 'squad', 'sawah']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Team Settings', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('team_id', [
            'label' => __('Team ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
            'default' => 0,
            'description' => __('Sportmonks team ID', 'sawah-sports'),
        ]);

        $this->add_control('show_stats', [
            'label' => __('Show Statistics', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->add_control('show_squad', [
            'label' => __('Show Squad', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->add_control('show_form', [
            'label' => __('Show Recent Form', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $team_id = (int)($settings['team_id'] ?? 0);
        
        if (!$team_id) {
            echo '<div class="ss-error">Please configure Team ID</div>';
            return;
        }

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');

        $id = 'ss-team-profile-' . esc_attr($this->get_id());
        ?>
        <div id="<?php echo $id; ?>" 
             class="ss-widget ss-team-profile" 
             data-team="<?php echo esc_attr($team_id); ?>"
             data-stats="<?php echo !empty($settings['show_stats']) ? '1' : '0'; ?>"
             data-squad="<?php echo !empty($settings['show_squad']) ? '1' : '0'; ?>"
             data-form="<?php echo !empty($settings['show_form']) ? '1' : '0'; ?>">
            
            <!-- Team Header -->
            <div class="ss-card">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Team Profile', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body">
                    <div class="ss-skeleton"></div>
                </div>
            </div>

        </div>
        <?php
    }
}
