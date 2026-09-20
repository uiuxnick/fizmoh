<?php
/**
 * Fizmoh API Client
 */

if (!defined('ABSPATH')) {
    exit;
}

class Fizmoh_API_Client {
    private $api_endpoint;
    private $api_key;
    private $store_id;

    public function __construct() {
        $this->api_endpoint = rtrim(get_option('fizmoh_api_endpoint', 'https://app.fizmoh.cloud'), '/');
        $this->api_key      = get_option('fizmoh_api_key', '');
        $this->store_id     = get_option('fizmoh_store_id', '');
    }

    public function is_configured() {
        return !empty($this->api_endpoint) && !empty($this->api_key);
    }

    public function get_api_endpoint() {
        return $this->api_endpoint;
    }

    public function get_api_key() {
        return $this->api_key;
    }

    public function get_store_id() {
        return $this->store_id;
    }

    /**
     * Send HTTP POST request to Fizmoh API
     */
    public function post($path, $data = array()) {
        if (!$this->is_configured()) {
            return new WP_Error('not_configured', __('Fizmoh API is not configured.', 'fizmoh-connect'));
        }

        $url = $this->api_endpoint . '/' . ltrim($path, '/');
        
        $body = wp_json_encode($data);

        $args = array(
            'method'      => 'POST',
            'timeout'     => 15,
            'redirection' => 5,
            'httpversion' => '1.1',
            'blocking'    => true,
            'headers'     => array(
                'Content-Type'  => 'application/json',
                'X-API-Key'     => $this->api_key,
                'Authorization' => 'Bearer ' . $this->api_key,
                'User-Agent'    => 'Fizmoh-WooCommerce-Plugin/' . FIZMOH_CONNECT_VERSION . ' (WordPress ' . get_bloginfo('version') . ')',
            ),
            'body'        => $body,
            'data_format' => 'body',
        );

        $response = wp_remote_post($url, $args);

        if (is_wp_error($response)) {
            error_log('[Fizmoh Connect] API Error: ' . $response->get_error_message());
            return $response;
        }

        $code = wp_remote_retrieve_response_code($response);
        $res_body = wp_remote_retrieve_body($response);
        $parsed = json_decode($res_body, true);

        if ($code >= 400) {
            $err_msg = isset($parsed['error']) ? $parsed['error'] : 'HTTP Error ' . $code;
            error_log('[Fizmoh Connect] API Non-200: ' . $code . ' - ' . $err_msg);
            return new WP_Error('api_error', $err_msg, array('status' => $code));
        }

        return $parsed;
    }

    /**
     * Test connection to Fizmoh platform
     */
    public function test_connection() {
        return $this->post('/api/ecommerce/orders', array(
            'storeId'   => $this->store_id,
            'eventType' => 'ORDER_CREATED',
            'order'     => array(
                'orderNumber'   => 'TEST-PING',
                'customerName'  => 'Test Connection',
                'customerPhone' => '+0000000000',
                'total'         => '0.00',
                'currency'      => get_woocommerce_currency(),
            ),
        ));
    }
}
