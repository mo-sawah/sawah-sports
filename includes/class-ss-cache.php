<?php
if (!defined('ABSPATH')) { exit; }

final class Sawah_Sports_Cache {
    public static function get(string $key) {
        return get_transient($key);
    }

    public static function set(string $key, $value, int $ttl): bool {
        return set_transient($key, $value, max(1, $ttl));
    }

    public static function delete_prefix(string $prefix): void {
        global $wpdb;
        // Best-effort cleanup for transients with prefix.
        // Works on default WP transient storage; object caches may ignore this.
        $like = $wpdb->esc_like('_transient_' . $prefix) . '%';
        $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like));
        $like2 = $wpdb->esc_like('_transient_timeout_' . $prefix) . '%';
        $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like2));
    }
}
