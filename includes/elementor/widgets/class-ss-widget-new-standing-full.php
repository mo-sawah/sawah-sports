<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_New_Standing_Full extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_new_standing_full'; }
    public function get_title() { return __('New Standing Full', 'sawah-sports'); }
    public function get_icon() { return 'eicon-table'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('section_settings', [
            'label' => __('Settings', 'sawah-sports'),
        ]);
        $this->add_control('season_id', [
            'label' => __('Season ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 21646,
        ]);
        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $season_id = (int)$settings['season_id'];
        ?>
        <div class="ss-new-standing-wrapper ss-full-table" data-season-id="<?php echo esc_attr($season_id); ?>">
            <div class="ss-ns-controls">
                <button class="ss-ns-tab active" data-type="overall">All</button>
                <button class="ss-ns-tab" data-type="home">Home</button>
                <button class="ss-ns-tab" data-type="away">Away</button>
            </div>
            <div class="ss-ns-container">
                <div class="ss-ns-loading"><div class="ss-ns-spinner"></div></div>
                <div class="ss-ns-content"></div>
            </div>
            <div class="ss-ns-legend"></div>
        </div>
        <?php
    }
}