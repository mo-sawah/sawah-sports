<?php
if (!defined('ABSPATH')) { exit; }

/**
 * League Hub Widget (SofaScore Style)
 * v7.1 - Complete UI Overhaul
 */
class Sawah_Sports_Widget_League_Hub extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_league_hub'; }
    public function get_title() { return __('League Hub (SofaScore Style)', 'sawah-sports'); }
    public function get_icon() { return 'eicon-site-search'; }
    public function get_categories() { return ['sawah-sport']; }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Content', 'sawah-sports'),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('league_id', [
            'label' => __('League ID', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::NUMBER,
            'default' => 0,
        ]);

        $this->add_control('season_id', [
            'label' => __('Season ID', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::NUMBER,
            'default' => 0,
        ]);

        $this->add_control('league_name', [
            'label' => __('League Name', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => 'Premier League',
        ]);

        $this->add_control('league_logo', [
            'label' => __('League Logo URL', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::MEDIA,
        ]);

        $this->add_control('country_name', [
            'label' => __('Country', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => 'England',
        ]);

         $this->add_control('country_flag', [
            'label' => __('Country Flag URL', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::MEDIA,
        ]);

        $this->add_control('season_label', [
            'label' => __('Season Label', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => '25/26',
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $s = $this->get_settings_for_display();
        $league_id = (int)($s['league_id'] ?? 0);
        $season_id = (int)($s['season_id'] ?? 0);
        
        $logo_url = !empty($s['league_logo']['url']) ? $s['league_logo']['url'] : '';
        $flag_url = !empty($s['country_flag']['url']) ? $s['country_flag']['url'] : '';

        $uid = 'ss-hub-' . $this->get_id();
        ?>
        <div id="<?php echo esc_attr($uid); ?>"
             class="ss-sofa-hub"
             data-league-id="<?php echo esc_attr($league_id); ?>"
             data-season-id="<?php echo esc_attr($season_id); ?>"
             data-current-date="<?php echo date('Y-m-d'); ?>">

            <div class="ss-sofa-header">
                <div class="ss-sofa-header-inner">
                    <div class="ss-sofa-logo-area">
                        <?php if($logo_url): ?>
                            <img src="<?php echo esc_url($logo_url); ?>" class="ss-league-logo-img" alt="League">
                        <?php endif; ?>
                        <div class="ss-header-texts">
                            <h1 class="ss-league-title">
                                <?php echo esc_html($s['league_name']); ?> 
                                <span class="ss-season-year"><?php echo esc_html($s['season_label']); ?></span>
                            </h1>
                            <div class="ss-league-meta">
                                <?php if($flag_url): ?>
                                    <img src="<?php echo esc_url($flag_url); ?>" class="ss-country-flag" alt="Flag">
                                <?php endif; ?>
                                <span class="ss-country-name"><?php echo esc_html($s['country_name']); ?></span>
                            </div>
                        </div>
                    </div>
                    <div class="ss-header-actions">
                        <button class="ss-fav-btn"><i class="eicon-star"></i> <?php echo esc_html__('Follow', 'sawah-sports'); ?></button>
                    </div>
                </div>
                <div class="ss-sofa-progress">
                    <div class="ss-progress-bar"><div class="ss-progress-fill" style="width: 45%"></div></div>
                    <div class="ss-progress-labels">
                        <span>Aug</span><span>May</span>
                    </div>
                </div>
            </div>

            <div class="ss-sofa-grid">
                
                <div class="ss-sofa-sidebar">
                    
                    <div class="ss-sofa-card ss-card-featured">
                        <div class="ss-card-head-sm"><?php echo esc_html__('Featured', 'sawah-sports'); ?></div>
                        <div class="ss-lh-featured-body">
                             <div class="ss-loading-sm"></div>
                        </div>
                    </div>

                    <div class="ss-sofa-card ss-card-matches">
                        <div class="ss-card-head-tabs">
                            <span class="active"><?php echo esc_html__('Matches', 'sawah-sports'); ?></span>
                        </div>
                        <div class="ss-matches-controls">
                            <button class="ss-round-nav prev"><i class="eicon-chevron-left"></i></button>
                            <span class="ss-current-round"><?php echo date('d M'); ?></span>
                            <button class="ss-round-nav next"><i class="eicon-chevron-right"></i></button>
                        </div>
                        <div class="ss-lh-matches-list">
                            <div class="ss-loading-sm"></div>
                        </div>
                    </div>

                </div>

                <div class="ss-sofa-main">
                    
                    <div class="ss-sofa-card ss-card-standings">
                        <div class="ss-main-tabs">
                            <div class="ss-main-tab active" data-target="standings"><?php echo esc_html__('Standings', 'sawah-sports'); ?></div>
                            <div class="ss-main-tab" data-target="stats"><?php echo esc_html__('Statistics', 'sawah-sports'); ?></div>
                            <div class="ss-main-tab" data-target="details"><?php echo esc_html__('Details', 'sawah-sports'); ?></div>
                        </div>

                        <div class="ss-sub-filters">
                            <button class="ss-sub-pill active" data-scope="all"><?php echo esc_html__('All', 'sawah-sports'); ?></button>
                            <button class="ss-sub-pill" data-scope="home"><?php echo esc_html__('Home', 'sawah-sports'); ?></button>
                            <button class="ss-sub-pill" data-scope="away"><?php echo esc_html__('Away', 'sawah-sports'); ?></button>
                        </div>

                        <div class="ss-lh-standings-body">
                             <div class="ss-loading"></div>
                        </div>
                        
                        <div class="ss-standings-legend">
                            <div class="ss-legend-item"><span class="dot promo"></span> <?php echo esc_html__('Promotion', 'sawah-sports'); ?></div>
                            <div class="ss-legend-item"><span class="dot rel"></span> <?php echo esc_html__('Relegation', 'sawah-sports'); ?></div>
                        </div>
                    </div>

                    <div class="ss-sofa-card ss-card-stats">
                        <div class="ss-card-head"><?php echo esc_html__('Top Players', 'sawah-sports'); ?></div>
                        <div class="ss-lh-topplayers-body"></div>
                    </div>

                </div>
            </div>
        </div>
        <?php
    }
}