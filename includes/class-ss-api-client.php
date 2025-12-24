<?php
if (!defined('ABSPATH')) { exit; }

final class Sawah_Sports_API_Client {
    private $base_url = 'https://api.sportmonks.com/v3/football/';
    private $token = '';

    public function __construct(string $token) {
        $this->token = $token;
    }

    private function build_url(string $path, array $query = []): string {
        $query['api_token'] = $this->token;
        $url = trailingslashit($this->base_url) . ltrim($path, '/');
        return add_query_arg($query, $url);
    }

    public function get(string $path, array $query = [], int $timeout = 12): array {
        if (empty($this->token)) {
            return ['ok' => false, 'status' => 0, 'error' => 'Missing API token'];
        }

        $url = $this->build_url($path, $query);
        $resp = wp_remote_get($url, [
            'timeout' => $timeout,
            'headers' => [
                'Accept' => 'application/json',
            ],
        ]);

        if (is_wp_error($resp)) {
            return ['ok' => false, 'status' => 0, 'error' => $resp->get_error_message()];
        }

        $code = (int) wp_remote_retrieve_response_code($resp);
        $body = (string) wp_remote_retrieve_body($resp);
        $json = json_decode($body, true);

        if ($code < 200 || $code >= 300) {
            $msg = is_array($json) && isset($json['message']) ? $json['message'] : 'HTTP ' . $code;
            return ['ok' => false, 'status' => $code, 'error' => $msg, 'raw' => $body];
        }

        if (!is_array($json)) {
            return ['ok' => false, 'status' => $code, 'error' => 'Invalid JSON', 'raw' => $body];
        }

        return ['ok' => true, 'status' => $code, 'data' => $json];
    }
}
