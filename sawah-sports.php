<?php
/**
 * Plugin Name: Sawah Sports
 * Description: Premium football widgets for Elementor powered by Sportmonks (live matches, fixtures, standings).
 * Version: 0.1.0
 * Author: Sawah Solutions
 * Text Domain: sawah-sports
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) { exit; }

define('SAWAH_SPORTS_VERSION', '0.1.0');
define('SAWAH_SPORTS_PATH', plugin_dir_path(__FILE__));
define('SAWAH_SPORTS_URL', plugin_dir_url(__FILE__));
define('SAWAH_SPORTS_OPTION_KEY', 'sawah_sports_settings');

require_once SAWAH_SPORTS_PATH . 'includes/class-ss-helpers.php';
require_once SAWAH_SPORTS_PATH . 'includes/class-ss-cache.php';
require_once SAWAH_SPORTS_PATH . 'includes/class-ss-api-client.php';
require_once SAWAH_SPORTS_PATH . 'includes/class-ss-admin.php';
require_once SAWAH_SPORTS_PATH . 'includes/class-ss-rest.php';
require_once SAWAH_SPORTS_PATH . 'includes/elementor/class-ss-elementor.php';

final class Sawah_Sports_Plugin {
    private static $instance = null;

    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
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
        // Admin settings + health checks.
        Sawah_Sports_Admin::instance();

        // REST endpoints (public read-only; token stays server-side).
        Sawah_Sports_REST::instance();

        // Elementor integration.
        add_action('plugins_loaded', function () {
            if (did_action('elementor/loaded')) {
                Sawah_Sports_Elementor::instance();
            } else {
                add_action('admin_notices', function () {
                    if (!current_user_can('activate_plugins')) return;
                    echo '<div class="notice notice-warning"><p><strong>Sawah Sports</strong> requires Elementor to be installed and active.</p></div>';
                });
            }
        }, 20);
    }
}

Sawah_Sports_Plugin::instance();
