<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Helper Functions for Sawah Sports Premium
 * Provides utilities, settings management, and Cyprus league support
 */
final class Sawah_Sports_Helpers {

    /**
     * Get plugin settings with defaults
     */
    public static function settings(): array {
        $defaults = [
            'api_token' => '',
            'cache_enabled' => 1,
            'ttl_live' => 20,
            'ttl_fixtures' => 300,
            'ttl_standings' => 3600,
            'ttl_statistics' => 1800,
            'ttl_xg' => 300,
            'ttl_odds' => 60,
            'ttl_predictions' => 3600,
            'rate_limit_per_min' => 60,
            'cyprus_focus' => 1,  // Prioritize Cyprus leagues
            'default_league' => SAWAH_CYPRUS_FIRST_DIVISION_ID,
        ];
        $opt = get_option(SAWAH_SPORTS_OPTION_KEY, []);
        return is_array($opt) ? array_merge($defaults, $opt) : $defaults;
    }

    /**
     * Get API token
     */
    public static function api_token(): string {
        $s = self::settings();
        return (string)($s['api_token'] ?? '');
    }

    /**
     * Get Cyprus league IDs
     */
    public static function cyprus_leagues(): array {
        return [
            SAWAH_CYPRUS_FIRST_DIVISION_ID,
            SAWAH_CYPRUS_CUP_ID,
        ];
    }

    /**
     * Check if Cyprus focus is enabled
     */
    public static function is_cyprus_focus(): bool {
        $s = self::settings();
        return !empty($s['cyprus_focus']);
    }

    /**
     * Convert value to boolean
     */
    public static function bool($val): bool {
        return (bool) filter_var($val, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?: (bool)$val;
    }

    /**
     * Sanitize comma-separated integer list
     */
    public static function sanitize_int_list($value): string {
        $value = is_array($value) ? implode(',', $value) : (string)$value;
        $parts = array_filter(array_map('trim', explode(',', $value)));
        $ints = [];
        foreach ($parts as $p) {
            if (preg_match('/^\d+$/', $p)) $ints[] = $p;
        }
        return implode(',', array_values(array_unique($ints)));
    }

    /**
     * Get rate limit key for IP and route
     */
    public static function rate_limit_key(string $route, string $ip): string {
        return 'ss_rl_' . md5($route . '|' . $ip);
    }

    /**
     * Get client IP address
     */
    public static function get_client_ip(): string {
        $ip = '';
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
        elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) $ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
        elseif (!empty($_SERVER['REMOTE_ADDR'])) $ip = $_SERVER['REMOTE_ADDR'];
        return preg_replace('/[^0-9a-fA-F:\.]/', '', (string)$ip);
    }

    /**
     * Format time ago
     */
    public static function time_ago(string $datetime): string {
        $timestamp = strtotime($datetime);
        if (!$timestamp) return '';
        
        $diff = time() - $timestamp;
        
        if ($diff < 60) return __('Just now', 'sawah-sports');
        if ($diff < 3600) return sprintf(_n('%d minute ago', '%d minutes ago', floor($diff / 60), 'sawah-sports'), floor($diff / 60));
        if ($diff < 86400) return sprintf(_n('%d hour ago', '%d hours ago', floor($diff / 3600), 'sawah-sports'), floor($diff / 3600));
        if ($diff < 604800) return sprintf(_n('%d day ago', '%d days ago', floor($diff / 86400), 'sawah-sports'), floor($diff / 86400));
        
        return date_i18n(get_option('date_format'), $timestamp);
    }

    /**
     * Get team logo URL with fallback
     */
    public static function get_team_logo($team, string $size = 'medium'): string {
        if (!$team) return '';
        
        // Try different possible image fields
        $logo = $team['image_path'] ?? $team['logo_path'] ?? $team['image'] ?? '';
        
        return $logo ? esc_url($logo) : '';
    }

    /**
     * Get team initials for fallback display
     */
    public static function get_team_initials($team): string {
        if (!$team) return '—';
        
        $name = $team['name'] ?? $team['short_code'] ?? '';
        if (empty($name)) return '—';
        
        $words = preg_split('/\s+/', trim($name));
        if (count($words) === 1) {
            return mb_substr($words[0], 0, 2);
        }
        
        return mb_substr($words[0], 0, 1) . mb_substr($words[count($words) - 1], 0, 1);
    }

    /**
     * Format score display
     */
    public static function format_score($fixture): string {
        $scores = $fixture['scores'] ?? [];
        if (!is_array($scores)) return '— : —';
        
        foreach ($scores as $score) {
            if (!is_array($score)) continue;
            $desc = strtolower($score['description'] ?? '');
            if (strpos($desc, 'current') !== false || strpos($desc, 'final') !== false) {
                $score_data = $score['score'] ?? [];
                if (is_array($score_data)) {
                    $home = $score_data['home'] ?? $score_data['home_score'] ?? '—';
                    $away = $score_data['away'] ?? $score_data['away_score'] ?? '—';
                    return $home . ' : ' . $away;
                }
            }
        }
        
        return '— : —';
    }

    /**
     * Get match status/state display
     */
    public static function get_match_state($fixture): array {
        $state = $fixture['state'] ?? [];
        if (!is_array($state)) return ['name' => '', 'short' => '', 'id' => 0];
        
        return [
            'name' => $state['name'] ?? '',
            'short' => $state['short_name'] ?? $state['short'] ?? '',
            'id' => $state['id'] ?? 0,
            'developer_name' => $state['developer_name'] ?? '',
        ];
    }

    /**
     * Check if match is live
     */
    public static function is_match_live($fixture): bool {
        $state = self::get_match_state($fixture);
        $live_states = ['LIVE', 'HT', 'BREAK', 'ET', 'PEN_LIVE', 'AET', 'LIVE_1ST', 'LIVE_2ND'];
        return in_array(strtoupper($state['short'] ?? ''), $live_states, true);
    }
}
