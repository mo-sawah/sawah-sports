<?php
if (!defined('ABSPATH')) { exit; }

final class Sawah_Sports_Helpers {

    public static function settings(): array {
        $defaults = [
            'api_token' => '',
            'cache_enabled' => 1,
            'ttl_live' => 20,        // seconds
            'ttl_fixtures' => 300,    // seconds
            'ttl_standings' => 3600,  // seconds
            'rate_limit_per_min' => 60, // per IP per route
        ];
        $opt = get_option(SAWAH_SPORTS_OPTION_KEY, []);
        if (!is_array($opt)) { $opt = []; }
        return array_merge($defaults, $opt);
    }

    public static function api_token(): string {
        $s = self::settings();
        return (string)($s['api_token'] ?? '');
    }

    public static function bool($val): bool {
        return (bool) filter_var($val, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?: (bool)$val;
    }

    public static function sanitize_int_list($value): string {
        $value = is_array($value) ? implode(',', $value) : (string)$value;
        $parts = array_filter(array_map('trim', explode(',', $value)));
        $ints = [];
        foreach ($parts as $p) {
            if (preg_match('/^\d+$/', $p)) $ints[] = $p;
        }
        return implode(',', array_values(array_unique($ints)));
    }

    public static function rate_limit_key(string $route, string $ip): string {
        return 'ss_rl_' . md5($route . '|' . $ip);
    }

    public static function get_client_ip(): string {
        $ip = '';
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
        elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) $ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
        elseif (!empty($_SERVER['REMOTE_ADDR'])) $ip = $_SERVER['REMOTE_ADDR'];
        return preg_replace('/[^0-9a-fA-F:\.]/', '', (string)$ip);
    }
}
