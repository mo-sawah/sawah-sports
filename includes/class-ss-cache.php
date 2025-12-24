<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Cache Management for Sawah Sports Premium
 * Handles WordPress transients with prefix-based cleanup
 */
final class Sawah_Sports_Cache {
    
    /**
     * Get cached value
     */
    public static function get(string $key) {
        return get_transient($key);
    }

    /**
     * Set cached value with TTL
     */
    public static function set(string $key, $value, int $ttl): bool {
        return set_transient($key, $value, max(1, $ttl));
    }

    /**
     * Delete single cache key
     */
    public static function delete(string $key): bool {
        return delete_transient($key);
    }

    /**
     * Delete all cache keys with given prefix
     */
    public static function delete_prefix(string $prefix): void {
        global $wpdb;
        
        // Delete transients
        $like = $wpdb->esc_like('_transient_' . $prefix) . '%';
        $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like));
        
        // Delete transient timeouts
        $like2 = $wpdb->esc_like('_transient_timeout_' . $prefix) . '%';
        $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like2));
        
        // If using object cache, try to clear it
        if (function_exists('wp_cache_flush_group')) {
            wp_cache_flush_group('sawah_sports');
        }
    }

    /**
     * Get cache statistics
     */
    public static function get_stats(): array {
        global $wpdb;
        
        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE %s",
            $wpdb->esc_like('_transient_ss_') . '%'
        ));
        
        return [
            'count' => (int)$count,
            'prefix' => 'ss_',
        ];
    }
}
