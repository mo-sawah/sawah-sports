<?php
if (!defined('ABSPATH')) { exit; }

class Sawah_Sports_Widget_New_Matches_Full extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_new_matches_full'; }
    public function get_title() { return __('New Matches Full', 'sawah-sports'); }
    public function get_icon() { return 'eicon-calendar'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('section_settings', [
            'label' => __('Settings', 'sawah-sports'),
        ]);

        $this->add_control('season_id', [
            'label' => __('Season ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 25996,
        ]);
        
        $this->add_control('date_locale', [
            'label'   => __('Date Language', 'sawah-sports'),
            'type'    => \Elementor\Controls_Manager::SELECT,
            'default' => 'el-GR',
            'options' => [
                'el-GR' => __('Greek', 'sawah-sports'),
                'en-GB' => __('English (UK)', 'sawah-sports'),
            ],
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $season_id = (int)$settings['season_id'];
        $locale = $settings['date_locale'] ?? 'el-GR';

        $i18n = [
            'gameweek' => __('Game Week', 'sawah-sports'),
            'no_data'  => __('No fixtures found.', 'sawah-sports'),
            'loading'  => __('Loading...', 'sawah-sports'),
        ];
        ?>
        <div class="ss-nmf-wrapper" data-season-id="<?php echo esc_attr($season_id); ?>" data-locale="<?php echo esc_attr($locale); ?>" data-i18n="<?php echo esc_attr(json_encode($i18n)); ?>">
            
            <div class="ss-nmf-slider-container">
                <button class="ss-nmf-nav prev">❮</button>
                <div class="ss-nmf-tabs-viewport">
                    <div class="ss-nmf-tabs-track"></div>
                </div>
                <button class="ss-nmf-nav next">❯</button>
            </div>

            <div class="ss-nmf-content">
                <div class="ss-nmf-loading"><div class="ss-nmf-spinner"></div></div>
                <div class="ss-nmf-fixtures"></div>
            </div>
            
        </div>
        <?php
    }
}