<?php
if (!defined('ABSPATH')) { exit; }

/**
 * League Hub Widget (SofaScore Style)
 * v7.3 - Fixed "Failed to fetch" by moving ALL requests to internal AJAX
 */

// --- Custom AJAX Handler ---
add_action('wp_ajax_ss_hub_data', 'ss_hub_handle_ajax');
add_action('wp_ajax_nopriv_ss_hub_data', 'ss_hub_handle_ajax');

function ss_hub_handle_ajax() {
    check_ajax_referer('ss_hub_nonce', 'nonce');

    $request_type = $_GET['req_type'] ?? '';
    $id = (int)($_GET['req_id'] ?? 0);
    
    $token = Sawah_Sports_Helpers::api_token();
    $client = new Sawah_Sports_API_Client($token);
    
    $data = [];
    
    // 1. Get Rounds
    if ($request_type === 'rounds') {
        $cache_key = 'ss_hub_rounds_' . $id;
        $cached = Sawah_Sports_Cache::get($cache_key);
        if ($cached) { $data = $cached; } 
        else {
            $res = $client->get('rounds/seasons/' . $id);
            if ($res['ok']) {
                $data = $res['data'];
                Sawah_Sports_Cache::set($cache_key, $data, 3600);
            }
        }
    }
    
    // 2. Get Fixtures by Round
    elseif ($request_type === 'fixtures') {
        $cache_key = 'ss_hub_fix_rnd_' . $id;
        $cached = Sawah_Sports_Cache::get($cache_key);
        if ($cached) { $data = $cached; }
        else {
            $params = ['include' => 'participants;scores;state;starting_at'];
            $res = $client->get('fixtures/rounds/' . $id, $params);
            if ($res['ok']) {
                $data = $res['data'];
                Sawah_Sports_Cache::set($cache_key, $data, 120);
            }
        }
    }

    // 3. Get Standings (NEW)
    elseif ($request_type === 'standings') {
        $cache_key = 'ss_hub_standings_' . $id;
        $cached = Sawah_Sports_Cache::get($cache_key);
        if ($cached) { $data = $cached; }
        else {
            $params = ['include' => 'participant;details.type;form'];
            $res = $client->get_standings($id, $params);
            if ($res['ok']) {
                $data = $res['data'];
                Sawah_Sports_Cache::set($cache_key, $data, 1800); // 30 mins
            }
        }
    }

    // 4. Get Top Scorers (NEW)
    elseif ($request_type === 'players') {
        $cache_key = 'ss_hub_players_' . $id;
        $cached = Sawah_Sports_Cache::get($cache_key);
        if ($cached) { $data = $cached; }
        else {
            // Manually replicate get_topscorers logic here to be safe
            $res = $client->get('topscorers/seasons/' . $id, [
                'include' => 'participant;player;type',
                'filters' => 'seasonTopscorerTypes:208', // Goals
            ]);
            if ($res['ok']) {
                $data = $res['data'];
                // Sort descending
                usort($data, function($a, $b) {
                    return ($b['total'] ?? 0) - ($a['total'] ?? 0);
                });
                Sawah_Sports_Cache::set($cache_key, $data, 3600);
            }
        }
    }

    wp_send_json_success($data);
}

class Sawah_Sports_Widget_League_Hub extends \Elementor\Widget_Base {

    public function get_name() { return 'sawah_sports_league_hub'; }
    public function get_title() { return __('League Hub (SofaScore V3)', 'sawah-sports'); }
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
            'default' => 'Cyprus 1st Division',
        ]);

        $this->add_control('league_logo', [
            'label' => __('League Logo', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::MEDIA,
        ]);

        $this->add_control('country_name', [
            'label' => __('Country', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => 'Cyprus',
        ]);
        
        $this->add_control('country_flag', [
            'label' => __('Country Flag', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::MEDIA,
        ]);

        $this->add_control('season_label', [
            'label' => __('Season Label', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => '25/26',
        ]);

        $this->add_control('about_title', [
            'label' => __('About Title', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXT,
            'default' => __('About', 'sawah-sports'),
        ]);

        $this->add_control('about_text', [
            'label' => __('About Text', 'sawah-sports'),
            'type'  => \Elementor\Controls_Manager::TEXTAREA,
            'default' => __('Follow fixtures, results, standings and top scorers.', 'sawah-sports'),
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $s = $this->get_settings_for_display();
        $league_id = (int)$s['league_id'];
        $season_id = (int)$s['season_id'];
        $logo_url = !empty($s['league_logo']['url']) ? $s['league_logo']['url'] : '';
        $flag_url = !empty($s['country_flag']['url']) ? $s['country_flag']['url'] : '';

        $uid = 'ss-hub-' . $this->get_id();
        $ajax_nonce = wp_create_nonce('ss_hub_nonce');
        
        ?>
        <div id="<?php echo esc_attr($uid); ?>"
             class="ss-sofa-hub"
             data-league-id="<?php echo esc_attr($league_id); ?>"
             data-season-id="<?php echo esc_attr($season_id); ?>"
             data-ajax-url="<?php echo esc_url(admin_url('admin-ajax.php')); ?>"
             data-nonce="<?php echo esc_attr($ajax_nonce); ?>">

            <div class="ss-sofa-header">
                <div class="ss-sofa-header-inner">
                    <div class="ss-sofa-logo-area">
                        <?php if($logo_url): ?><img src="<?php echo esc_url($logo_url); ?>" class="ss-league-logo-img" alt=""><?php endif; ?>
                        <div class="ss-header-texts">
                            <h1 class="ss-league-title">
                                <?php echo esc_html($s['league_name']); ?> 
                                <span class="ss-season-year"><?php echo esc_html($s['season_label']); ?></span>
                            </h1>
                            <div class="ss-league-meta">
                                <?php if($flag_url): ?><img src="<?php echo esc_url($flag_url); ?>" class="ss-country-flag" alt=""><?php endif; ?>
                                <span class="ss-country-name"><?php echo esc_html($s['country_name']); ?></span>
                            </div>
                        </div>
                    </div>
                    <div class="ss-header-actions">
                         <button class="ss-fav-btn"><i class="eicon-star"></i> <?php echo esc_html__('Follow', 'sawah-sports'); ?></button>
                    </div>
                </div>
            </div>

            <div class="ss-sofa-grid">
                
                <div class="ss-sofa-sidebar">
                    <div class="ss-sofa-card ss-card-featured">
                        <div class="ss-card-head-sm"><?php echo esc_html__('Featured Match', 'sawah-sports'); ?></div>
                        <div class="ss-lh-featured-body"><div class="ss-loading-sm"></div></div>
                    </div>

                    <div class="ss-sofa-card ss-card-matches">
                        <div class="ss-card-head-tabs"><span class="active"><?php echo esc_html__('Matches', 'sawah-sports'); ?></span></div>
                        <div class="ss-matches-controls">
                            <button class="ss-round-nav prev"><i class="eicon-chevron-left"></i></button>
                            <span class="ss-current-round"><?php echo esc_html__('Loading...', 'sawah-sports'); ?></span>
                            <button class="ss-round-nav next"><i class="eicon-chevron-right"></i></button>
                        </div>
                        <div class="ss-lh-matches-list"><div class="ss-loading-sm"></div></div>
                    </div>

                    <div class="ss-sofa-card ss-card-topplayers">
                        <div class="ss-card-head-sm"><?php echo esc_html__('Top Players', 'sawah-sports'); ?></div>
                        <div class="ss-lh-topplayers-body"><div class="ss-loading-sm"></div></div>
                    </div>
                </div>

                <div class="ss-sofa-main">
                    <div class="ss-sofa-card ss-card-standings">
                        <div class="ss-main-tabs">
                            <div class="ss-main-tab active" data-target="standings"><?php echo esc_html__('Standings', 'sawah-sports'); ?></div>
                        </div>
                        <div class="ss-sub-filters">
                            <button class="ss-sub-pill active" data-scope="all"><?php echo esc_html__('All', 'sawah-sports'); ?></button>
                            <button class="ss-sub-pill" data-scope="home"><?php echo esc_html__('Home', 'sawah-sports'); ?></button>
                            <button class="ss-sub-pill" data-scope="away"><?php echo esc_html__('Away', 'sawah-sports'); ?></button>
                        </div>
                        <div class="ss-lh-standings-body"><div class="ss-loading"></div></div>
                        <div class="ss-standings-legend">
                            <div class="ss-legend-item"><span class="dot promo"></span> <?php echo esc_html__('Promotion', 'sawah-sports'); ?></div>
                            <div class="ss-legend-item"><span class="dot rel"></span> <?php echo esc_html__('Relegation', 'sawah-sports'); ?></div>
                        </div>
                    </div>

                    <div class="ss-sofa-card ss-card-about">
                        <div class="ss-card-head-sm"><?php echo esc_html($s['about_title']); ?></div>
                        <div style="padding:16px; font-size:14px; color:#555; line-height:1.6;">
                            <?php echo wp_kses_post(nl2br($s['about_text'])); ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
}