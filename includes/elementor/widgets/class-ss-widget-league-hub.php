<?php
if (!defined('ABSPATH')) { exit; }

/**
 * League Hub Widget (Light Mode) - SofaScore-style tournament overview (MVP)
 * Uses existing Sawah Sports REST endpoints:
 *  - /fixtures?date=YYYY-MM-DD (client-side league filter)
 *  - /standings/{season_id}
 *  - /topscorers/{season_id}?type=goals|assists
 */
class Sawah_Sports_Widget_League_Hub extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_league_hub'; }
    public function get_title() { return __('League Hub (SofaScore-style)', 'sawah-sports'); }
    public function get_icon() { return 'eicon-site-search'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Content', 'sawah-sports'),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('league_id', [
            'label' => __('League ID (SportsMonks)', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::NUMBER,
            'min'   => 1,
            'step'  => 1,
            'default' => 0,
        ]);

        $this->add_control('season_id', [
            'label' => __('Season ID (SportsMonks)', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::NUMBER,
            'min'   => 1,
            'step'  => 1,
            'default' => 0,
        ]);

        $this->add_control('league_name', [
            'label' => __('League Name', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => __('Cyprus 1st Division', 'sawah-sports'),
        ]);

        $this->add_control('country_name', [
            'label' => __('Country', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => __('Cyprus', 'sawah-sports'),
        ]);

        $this->add_control('season_label', [
            'label' => __('Season Label', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => __('2025/2026', 'sawah-sports'),
        ]);

        $this->add_control('default_date', [
            'label' => __('Default Date (YYYY-MM-DD)', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => '',
            'description' => __('Leave empty for today.', 'sawah-sports'),
        ]);

        $this->add_control('show_about', [
            'label' => __('Show About Box', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::SWITCHER,
            'label_on' => __('Yes', 'sawah-sports'),
            'label_off'=> __('No', 'sawah-sports'),
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->add_control('about_title', [
            'label' => __('About Title', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => __('About', 'sawah-sports'),
            'condition' => ['show_about' => 'yes'],
        ]);

        $this->add_control('about_text', [
            'label' => __('About Text', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXTAREA,
            'default' => __('Follow fixtures, results, standings and top scorers for the Cyprus league.', 'sawah-sports'),
            'rows' => 7,
            'condition' => ['show_about' => 'yes'],
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $s = $this->get_settings_for_display();
        $league_id = (int)($s['league_id'] ?? 0);
        $season_id = (int)($s['season_id'] ?? 0);

        $default_date = trim((string)($s['default_date'] ?? ''));
        if ($default_date === '') { $default_date = wp_date('Y-m-d'); }

        $uid = 'ss-league-hub-' . $this->get_id();
        ?>
        <div id="<?php echo esc_attr($uid); ?>"
             class="ss-league-hub"
             data-league-id="<?php echo esc_attr($league_id); ?>"
             data-season-id="<?php echo esc_attr($season_id); ?>"
             data-default-date="<?php echo esc_attr($default_date); ?>">

            <div class="ss-lh-header">
                <div class="ss-lh-title">
                    <div class="ss-lh-title-main"><?php echo esc_html($s['league_name'] ?? ''); ?></div>
                    <div class="ss-lh-title-sub">
                        <span class="ss-lh-country"><?php echo esc_html($s['country_name'] ?? ''); ?></span>
                        <span class="ss-lh-dot">•</span>
                        <span class="ss-lh-season"><?php echo esc_html($s['season_label'] ?? ''); ?></span>
                    </div>
                </div>
                <div class="ss-lh-actions">
                    <button type="button" class="ss-lh-refresh" aria-label="<?php echo esc_attr__('Refresh', 'sawah-sports'); ?>">
                        <i class="eicon-reload"></i>
                    </button>
                </div>
            </div>

            <div class="ss-lh-grid">
                <!-- LEFT -->
                <div class="ss-lh-col ss-lh-col-left">
                    <div class="ss-card ss-lh-featured">
                        <div class="ss-card-head">
                            <div class="ss-card-title"><?php echo esc_html__('Featured', 'sawah-sports'); ?></div>
                            <div class="ss-card-actions">
                                <span class="ss-lh-date"></span>
                            </div>
                        </div>
                        <div class="ss-card-body">
                            <div class="ss-lh-featured-body">
                                <div class="ss-loading"><div class="ss-spinner"></div></div>
                            </div>
                        </div>
                    </div>

                    <div class="ss-card ss-lh-matches">
                        <div class="ss-card-head">
                            <div class="ss-card-title"><?php echo esc_html__('Matches', 'sawah-sports'); ?></div>
                            <div class="ss-lh-controls">
                                <button class="ss-pill ss-pill-active" data-filter="all"><?php echo esc_html__('All', 'sawah-sports'); ?></button>
                                <button class="ss-pill" data-filter="live"><?php echo esc_html__('Live', 'sawah-sports'); ?> <span class="ss-lh-live-count">(0)</span></button>
                                <div class="ss-lh-search">
                                    <i class="eicon-search"></i>
                                    <input type="text" class="ss-lh-search-input" placeholder="<?php echo esc_attr__('Search matches...', 'sawah-sports'); ?>">
                                </div>
                            </div>
                        </div>
                        <div class="ss-card-body">
                            <div class="ss-lh-matches-list">
                                <div class="ss-loading"><div class="ss-spinner"></div></div>
                            </div>
                        </div>
                    </div>

                    <div class="ss-card ss-lh-topplayers">
                        <div class="ss-card-head">
                            <div class="ss-card-title"><?php echo esc_html__('Top Players', 'sawah-sports'); ?></div>
                            <div class="ss-tabs">
                                <button class="ss-tab ss-tab-active" data-type="goals"><?php echo esc_html__('Goals', 'sawah-sports'); ?></button>
                                <button class="ss-tab" data-type="assists"><?php echo esc_html__('Assists', 'sawah-sports'); ?></button>
                            </div>
                        </div>
                        <div class="ss-card-body">
                            <div class="ss-lh-topplayers-body">
                                <div class="ss-loading"><div class="ss-spinner"></div></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- RIGHT -->
                <div class="ss-lh-col ss-lh-col-right">
                    <div class="ss-card ss-lh-standings">
                        <div class="ss-card-head">
                            <div class="ss-card-title"><?php echo esc_html__('Standings', 'sawah-sports'); ?></div>
                            <div class="ss-tabs ss-tabs-compact">
                                <button class="ss-tab ss-tab-active" data-scope="all"><?php echo esc_html__('All', 'sawah-sports'); ?></button>
                                <button class="ss-tab" data-scope="home"><?php echo esc_html__('Home', 'sawah-sports'); ?></button>
                                <button class="ss-tab" data-scope="away"><?php echo esc_html__('Away', 'sawah-sports'); ?></button>
                            </div>
                        </div>
                        <div class="ss-card-body">
                            <div class="ss-lh-standings-body">
                                <div class="ss-loading"><div class="ss-spinner"></div></div>
                            </div>
                        </div>
                    </div>

                    <?php if (($s['show_about'] ?? '') === 'yes'): ?>
                    <div class="ss-card ss-lh-about">
                        <div class="ss-card-head">
                            <div class="ss-card-title"><?php echo esc_html($s['about_title'] ?? __('About', 'sawah-sports')); ?></div>
                        </div>
                        <div class="ss-card-body">
                            <div class="ss-lh-about-text"><?php echo wp_kses_post(nl2br($s['about_text'] ?? '')); ?></div>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

        </div>
        <?php
    }
}
