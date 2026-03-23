<?php
if (!defined('ABSPATH')) { exit; }

/**
 * New Fixtures & Results Widget
 * Displays last round results + upcoming fixtures for a chosen league/season.
 * Grouped by date, BBC Sport / Flashscore style layout.
 */
class Sawah_Sports_Widget_Fixtures_Results extends \Elementor\Widget_Base {

    public function get_name() {
        return 'sawah_sports_fixtures_results';
    }

    public function get_title() {
        return __('New Fixtures & Results', 'sawah-sports');
    }

    public function get_icon() {
        return 'eicon-post-list';
    }

    public function get_categories() {
        return ['sawah-sport'];
    }

    protected function register_controls() {

        /* ── Content: League Settings ── */
        $this->start_controls_section('section_settings', [
            'label' => __('League Settings', 'sawah-sports'),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('season_id', [
            'label'       => __('Sportmonks Season ID', 'sawah-sports'),
            'type'        => \Elementor\Controls_Manager::NUMBER,
            'default'     => 0,
            'min'         => 0,
            'description' => __('Find the Season ID in your Sportmonks dashboard → Seasons. Each season of a league has a unique numeric ID.', 'sawah-sports'),
        ]);

        $this->add_control('past_dates', [
            'label'       => __('Past Date Groups', 'sawah-sports'),
            'type'        => \Elementor\Controls_Manager::NUMBER,
            'default'     => 1,
            'min'         => 1,
            'max'         => 5,
            'description' => __('How many past match-day groups to show (1 = last match day only).', 'sawah-sports'),
        ]);

        $this->add_control('upcoming_dates', [
            'label'       => __('Upcoming Date Groups', 'sawah-sports'),
            'type'        => \Elementor\Controls_Manager::NUMBER,
            'default'     => 3,
            'min'         => 1,
            'max'         => 7,
            'description' => __('How many upcoming match-day groups to show.', 'sawah-sports'),
        ]);

        $this->add_control('date_locale', [
            'label'   => __('Date Language', 'sawah-sports'),
            'type'    => \Elementor\Controls_Manager::SELECT,
            'default' => 'el-GR',
            'options' => [
                'el-GR' => __('Greek', 'sawah-sports'),
                'en-GB' => __('English (UK)', 'sawah-sports'),
                'en-US' => __('English (US)', 'sawah-sports'),
                'fr-FR' => __('French', 'sawah-sports'),
                'de-DE' => __('German', 'sawah-sports'),
                'es-ES' => __('Spanish', 'sawah-sports'),
                'it-IT' => __('Italian', 'sawah-sports'),
                'tr-TR' => __('Turkish', 'sawah-sports'),
                'ar-SA' => __('Arabic', 'sawah-sports'),
            ],
        ]);

        $this->end_controls_section();

        /* ── Content: More Button ── */
        $this->start_controls_section('section_more', [
            'label' => __('More Button', 'sawah-sports'),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('more_link_url', [
            'label'         => __('More Button Link', 'sawah-sports'),
            'type'          => \Elementor\Controls_Manager::URL,
            'placeholder'   => 'https://example.com/premier-league',
            'description'   => __('Leave empty to hide the More button.', 'sawah-sports'),
            'show_external' => true,
            'default'       => ['url' => '', 'is_external' => false],
        ]);

        $this->add_control('more_link_text', [
            'label'   => __('Button Text', 'sawah-sports'),
            'type'    => \Elementor\Controls_Manager::TEXT,
            'default' => __('More', 'sawah-sports'),
        ]);

        $this->end_controls_section();

        /* ── Style: Widget ── */
        $this->start_controls_section('section_style', [
            'label' => __('Style', 'sawah-sports'),
            'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
        ]);

        $this->add_control('card_background', [
            'label'   => __('Card Background', 'sawah-sports'),
            'type'    => \Elementor\Controls_Manager::COLOR,
            'default' => '#ffffff',
            'selectors' => [
                '{{WRAPPER}} .ss-fr-date-group' => 'background-color: {{VALUE}};',
            ],
        ]);

        $this->add_control('team_name_color', [
            'label'   => __('Team Name Color', 'sawah-sports'),
            'type'    => \Elementor\Controls_Manager::COLOR,
            'default' => '#1a1a1a',
            'selectors' => [
                '{{WRAPPER}} .ss-fr-team-name' => 'color: {{VALUE}};',
            ],
        ]);

        $this->add_control('date_header_color', [
            'label'   => __('Date Header Color', 'sawah-sports'),
            'type'    => \Elementor\Controls_Manager::COLOR,
            'default' => '#555555',
            'selectors' => [
                '{{WRAPPER}} .ss-fr-date-header' => 'color: {{VALUE}};',
            ],
        ]);

        $this->add_control('more_btn_color', [
            'label'   => __('More Button Color', 'sawah-sports'),
            'type'    => \Elementor\Controls_Manager::COLOR,
            'default' => '#1a1a1a',
            'selectors' => [
                '{{WRAPPER}} .ss-fr-more-btn' => 'color: {{VALUE}}; border-color: {{VALUE}};',
            ],
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings  = $this->get_settings_for_display();
        $widget_id = $this->get_id();

        $season_id       = (int) ($settings['season_id'] ?? 0);
        $past_dates      = max(1, min(5, (int) ($settings['past_dates'] ?? 1)));
        $upcoming_dates  = max(1, min(7, (int) ($settings['upcoming_dates'] ?? 3)));
        $locale          = sanitize_text_field($settings['date_locale'] ?? 'el-GR');
        $more_text       = sanitize_text_field($settings['more_link_text'] ?? 'More');

        $more_url = '';
        if (!empty($settings['more_link_url']['url'])) {
            $more_url = $settings['more_link_url']['url'];
        }

        $is_external = !empty($settings['more_link_url']['is_external']) ? 'target="_blank" rel="noopener noreferrer"' : '';
        ?>
        <div id="ss-fr-<?php echo esc_attr($widget_id); ?>"
             class="ss-fixtures-results"
             data-season-id="<?php echo esc_attr($season_id); ?>"
             data-past-dates="<?php echo esc_attr($past_dates); ?>"
             data-upcoming-dates="<?php echo esc_attr($upcoming_dates); ?>"
             data-locale="<?php echo esc_attr($locale); ?>"
             data-more-url="<?php echo esc_url($more_url); ?>"
             data-more-text="<?php echo esc_attr($more_text); ?>"
             data-more-external="<?php echo esc_attr($is_external ? '1' : '0'); ?>">

            <div class="ss-fr-body">
                <div class="ss-fr-loading">
                    <div class="ss-fr-spinner"></div>
                </div>
            </div>
        </div>
        <?php
    }
}