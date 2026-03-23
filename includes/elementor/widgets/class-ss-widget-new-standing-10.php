<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_New_Standing_10 extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_new_standing_10'; }
    public function get_title() { return __('New Standing 10', 'sawah-sports'); }
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

        $this->add_control('more_link', [
            'label' => __('More Button Link', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::URL,
            'default' => ['url' => ''],
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $season_id = (int)$settings['season_id'];
        $more_url = $settings['more_link']['url'] ?? '';
        ?>
        <div class="ss-new-standing-wrapper ss-limit-10" data-season-id="<?php echo esc_attr($season_id); ?>">
            <div class="ss-ns-container">
                <div class="ss-ns-loading"><div class="ss-ns-spinner"></div></div>
                <div class="ss-ns-content"></div>
                <?php if ($more_url): ?>
                    <div class="ss-ns-more-wrapper">
                        <a href="<?php echo esc_url($more_url); ?>" class="ss-ns-more-btn">More</a>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
}