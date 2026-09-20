<?php
/**
 * Fizmoh Real-Time Cart & Checkout Tracker
 */

if (!defined('ABSPATH')) {
    exit;
}

class Fizmoh_Cart_Tracker {
    private $api;

    public function __construct($api) {
        $this->api = $api;

        add_action('wp_enqueue_scripts', array($this, 'enqueue_tracker_script'));
        add_action('wp_ajax_fizmoh_track_checkout', array($this, 'ajax_track_checkout'));
        add_action('wp_ajax_nopriv_fizmoh_track_checkout', array($this, 'ajax_track_checkout'));

        // Handle cart restoration via 1-click URL
        add_action('template_redirect', array($this, 'handle_cart_restore_url'));
    }

    public function enqueue_tracker_script() {
        if (!is_checkout() && !is_cart()) {
            return;
        }

        if (get_option('fizmoh_abandoned_cart_enabled', 'yes') !== 'yes') {
            return;
        }

        wp_enqueue_script(
            'fizmoh-checkout-tracker',
            FIZMOH_CONNECT_URL . 'assets/js/checkout-tracker.js',
            array('jquery'),
            FIZMOH_CONNECT_VERSION,
            true
        );

        wp_localize_script('fizmoh-checkout-tracker', 'fizmoh_tracker_params', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('fizmoh_tracker_nonce'),
        ));
    }

    /**
     * AJAX endpoint receiving real-time contact info as shopper types in checkout
     */
    public function ajax_track_checkout() {
        check_ajax_referer('fizmoh_tracker_nonce', 'nonce');

        if (!$this->api->is_configured()) {
            wp_send_json_error(array('message' => 'API not configured'));
        }

        $phone = isset($_POST['phone']) ? sanitize_text_field($_POST['phone']) : '';
        $email = isset($_POST['email']) ? sanitize_email($_POST['email']) : '';
        $first_name = isset($_POST['first_name']) ? sanitize_text_field($_POST['first_name']) : '';
        $last_name = isset($_POST['last_name']) ? sanitize_text_field($_POST['last_name']) : '';

        if (empty($phone)) {
            wp_send_json_error(array('message' => 'Phone number required'));
        }

        if (!WC()->cart || WC()->cart->is_empty()) {
            wp_send_json_error(array('message' => 'Cart is empty'));
        }

        // Generate cart token from WC session
        $cart_token = WC()->session ? WC()->session->get_customer_id() : '';
        if (empty($cart_token)) {
            $cart_token = md5($phone . '_' . time());
        }

        // Build item array
        $items = array();
        $restore_items = array();
        foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
            $product = $cart_item['data'];
            $items[] = array(
                'id'       => $cart_item['product_id'],
                'title'    => $product->get_name(),
                'quantity' => $cart_item['quantity'],
                'price'    => (float)$product->get_price(),
            );
            $restore_items[] = $cart_item['product_id'] . ':' . $cart_item['quantity'];
        }

        // Generate 1-click cart restoration link
        $checkout_url = wc_get_checkout_url();
        $restore_param = base64_encode(implode(',', $restore_items));
        $restore_url = add_query_arg(array('fizmoh_restore' => $restore_param), $checkout_url);

        $customer_name = trim($first_name . ' ' . $last_name);
        if (empty($customer_name)) {
            $customer_name = 'Customer';
        }

        $payload = array(
            'storeId'       => $this->api->get_store_id(),
            'cartToken'     => (string)$cart_token,
            'customerPhone' => $phone,
            'customerEmail' => $email,
            'customerName'  => $customer_name,
            'cartTotal'     => (float)WC()->cart->total,
            'currency'      => get_woocommerce_currency(),
            'items'         => $items,
            'checkoutUrl'   => $restore_url,
            'metadata'      => array(
                'captured_at' => current_time('mysql'),
                'source'      => 'checkout_presubmit_tracker',
            ),
        );

        $response = $this->api->post('/api/ecommerce/cart-abandoned', $payload);

        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => $response->get_error_message()));
        }

        wp_send_json_success(array('tracked' => true));
    }

    /**
     * Restore cart items when customer taps the WhatsApp recovery link
     */
    public function handle_cart_restore_url() {
        if (!isset($_GET['fizmoh_restore'])) {
            return;
        }

        $encoded = sanitize_text_field($_GET['fizmoh_restore']);
        $decoded = base64_decode($encoded);
        if (empty($decoded)) {
            return;
        }

        if (WC()->cart) {
            WC()->cart->empty_cart();
            $pairs = explode(',', $decoded);
            foreach ($pairs as $pair) {
                $parts = explode(':', $pair);
                if (count($parts) === 2) {
                    $prod_id = absint($parts[0]);
                    $qty = absint($parts[1]);
                    if ($prod_id > 0 && $qty > 0) {
                        WC()->cart->add_to_cart($prod_id, $qty);
                    }
                }
            }
        }
    }
}
