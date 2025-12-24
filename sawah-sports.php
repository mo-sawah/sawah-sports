<?php
/**
 * Plugin Name: Sawah Sports Premium
 * Description: Premium football statistics & analytics for Elementor powered by Sportmonks API - Optimized for Cyprus Football
 * Version: 3.0.2
 * Author: Sawah Solutions
 * Author URI: https://sawahsolutions.com
 * Text Domain: sawah-sports
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) { exit; }

define('SAWAH_SPORTS_VERSION', '3.0.2');
define('SAWAH_SPORTS_PATH', plugin_dir_path(__FILE__));
define('SAWAH_SPORTS_URL', plugin_dir_url(__FILE__));
define('SAWAH_SPORTS_OPTION_KEY', 'sawah_sports_settings');

// Cyprus League IDs
define('SAWAH_CYPRUS_FIRST_DIVISION_ID', 570);
define('SAWAH_CYPRUS_CUP_ID', 215);

require_once SAWAH_SPORTS_PATH . 'includes/class-ss-helpers.php';
require_once SAWAH_SPORTS_PATH . 'includes/class-ss-cache.php';
require_once SAWAH_SPORTS_PATH . 'includes/class-ss-api-client.php';
require_once SAWAH_SPORTS_PATH . 'includes/class-ss-admin.php';
require_once SAWAH_SPORTS_PATH . 'includes/class-ss-rest.php';
require_once SAWAH_SPORTS_PATH . 'includes/elementor/class-ss-elementor.php';

final class Sawah_Sports_Plugin {
    private static $instance = null;

    public static function instance() {
        if (self::$instance === null) self::$instance = new self();
        return self::$instance;
    }

    private function __construct() {
        add_action('init', [$this, 'load_textdomain']);
        add_action('plugins_loaded', [$this, 'bootstrap']);
    }

    public function load_textdomain() {
        load_plugin_textdomain('sawah-sports', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    public function bootstrap() {
        Sawah_Sports_Admin::instance();
        Sawah_Sports_REST::instance();

        add_action('plugins_loaded', function () {
            if (did_action('elementor/loaded')) {
                Sawah_Sports_Elementor::instance();
            } else {
                add_action('admin_notices', function () {
                    if (!current_user_can('activate_plugins')) return;
                    echo '<div class="notice notice-warning"><p><strong>Sawah Sports Premium</strong> requires Elementor to be installed and active.</p></div>';
                });
            }
        }, 20);
    }
}

Sawah_Sports_Plugin::instance();
