<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Match Center Widget - Complete Match Analysis
 * Shows: Timeline, Statistics, Lineups, Events, xG
 */
class Sawah_Sports_Widget_Match_Center extends \Elementor\Widget_Base {

    public function get_name() { 
        return 'sawah_sports_match_center'; 
    }

    public function get_title() { 
        return __('Match Center', 'sawah-sports'); 
    }

    public function get_icon() { 
        return 'eicon-info-circle'; 
    }

    public function get_categories() { 
        return ['sawah-sport']; 
    }

    public function get_keywords() { 
        return ['football', 'match', 'center', 'details', 'statistics', 'lineup', 'sawah']; 
    }

    protected function register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Match Settings', 'sawah-sports'),
            'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('fixture_id', [
            'label' => __('Fixture ID', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'min' => 1,
            'default' => 0,
            'description' => __('Enter the Sportmonks fixture ID for the match', 'sawah-sports'),
        ]);

        $this->add_control('show_timeline', [
            'label' => __('Show Timeline', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->add_control('show_stats', [
            'label' => __('Show Statistics', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->add_control('show_lineups', [
            'label' => __('Show Lineups', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->add_control('show_xg', [
            'label' => __('Show xG Analysis', 'sawah-sports'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default' => 'yes',
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $fixture_id = (int)($settings['fixture_id'] ?? 0);
        
        if (!$fixture_id) {
            echo '<div class="ss-error">Please configure Fixture ID in widget settings</div>';
            return;
        }

        $show_timeline = !empty($settings['show_timeline']);
        $show_stats = !empty($settings['show_stats']);
        $show_lineups = !empty($settings['show_lineups']);
        $show_xg = !empty($settings['show_xg']);

        wp_enqueue_style('sawah-sports');
        wp_enqueue_script('sawah-sports-live');

        $id = 'ss-match-center-' . esc_attr($this->get_id());
        ?>
        <div id="<?php echo $id; ?>" 
             class="ss-widget ss-match-center" 
             data-fixture="<?php echo esc_attr($fixture_id); ?>"
             data-timeline="<?php echo $show_timeline ? '1' : '0'; ?>"
             data-stats="<?php echo $show_stats ? '1' : '0'; ?>"
             data-lineups="<?php echo $show_lineups ? '1' : '0'; ?>"
             data-xg="<?php echo $show_xg ? '1' : '0'; ?>">
            
            <!-- Match Header -->
            <div class="ss-card ss-match-header">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Match Center', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body">
                    <div class="ss-skeleton"></div>
                </div>
            </div>

            <?php if ($show_timeline): ?>
            <!-- Timeline -->
            <div class="ss-card ss-mt-2">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Match Timeline', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body ss-timeline-body">
                    <div class="ss-skeleton"></div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($show_stats): ?>
            <!-- Statistics -->
            <div class="ss-card ss-mt-2">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Match Statistics', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body ss-stats-body">
                    <div class="ss-skeleton"></div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($show_xg): ?>
            <!-- xG Analysis -->
            <div class="ss-card ss-mt-2">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Expected Goals (xG)', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body ss-xg-body">
                    <div class="ss-skeleton"></div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($show_lineups): ?>
            <!-- Lineups -->
            <div class="ss-card ss-mt-2">
                <div class="ss-card-head">
                    <div class="ss-title"><?php echo esc_html__('Lineups', 'sawah-sports'); ?></div>
                </div>
                <div class="ss-body ss-lineups-body">
                    <div class="ss-skeleton"></div>
                </div>
            </div>
            <?php endif; ?>

        </div>
        <?php
    }
}
