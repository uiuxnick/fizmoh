<?php
/**
 * Fizmoh Order Synchronization
 */

if (!defined('ABSPATH')) {
    exit;
}

class Fizmoh_Order_Sync {
    private $api;

    public function __construct($api) {
        $this->api = $api;

        // Order status change hooks
        add_action('woocommerce_order_status_changed', array($this, 'on_order_status_changed'), 10, 4);
        add_action('woocommerce_new_order', array($this, 'on_new_order'), 10, 2);
    }

    /**
     * Handle newly created order
     */
    public function on_new_order($order_id, $order = null) {
        if (!$this->api->is_configured()) {
            return;
        }

        if (!$order) {
            $order = wc_get_order($order_id);
        }
        if (!$order) {
            return;
        }

        if (get_option('fizmoh_notify_order_created', 'yes') !== 'yes') {
            return;
        }

        $this->dispatch_order_event($order, 'ORDER_CREATED');
    }

    /**
     * Handle WooCommerce order status transitions
     */
    public function on_order_status_changed($order_id, $old_status, $new_status, $order) {
        if (!$this->api->is_configured()) {
            return;
        }

        if (!$order) {
            $order = wc_get_order($order_id);
        }
        if (!$order) {
            return;
        }

        $event_type = null;

        switch ($new_status) {
            case 'processing':
                if (get_option('fizmoh_notify_order_processing', 'yes') === 'yes') {
                    $event_type = 'ORDER_PROCESSING';
                }
                break;

            case 'completed':
                if (get_option('fizmoh_notify_order_completed', 'yes') === 'yes') {
                    $event_type = 'ORDER_SHIPPED';
                }
                break;

            case 'cancelled':
            case 'refunded':
                if (get_option('fizmoh_notify_order_cancelled', 'yes') === 'yes') {
                    $event_type = 'ORDER_CANCELLED';
                }
                break;
        }

        if ($event_type) {
            $this->dispatch_order_event($order, $event_type);
        }
    }

    /**
     * Format and dispatch order payload to Fizmoh REST API
     */
    public function dispatch_order_event($order, $event_type) {
        $phone = $order->get_billing_phone();
        if (empty($phone)) {
            $phone = $order->get_shipping_phone();
        }
        if (empty($phone)) {
            return;
        }

        $customer_name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
        if (empty($customer_name)) {
            $customer_name = trim($order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name());
        }
        if (empty($customer_name)) {
            $customer_name = 'Customer';
        }

        // Extract tracking metadata
        $tracking_info = $this->extract_tracking_info($order);

        $payload = array(
            'storeId'   => $this->api->get_store_id(),
            'eventType' => $event_type,
            'order'     => array(
                'orderId'        => (string)$order->get_id(),
                'orderNumber'    => (string)$order->get_order_number(),
                'customerName'   => $customer_name,
                'customerPhone'  => $phone,
                'customerEmail'  => $order->get_billing_email(),
                'total'          => $order->get_total(),
                'currency'       => $order->get_currency(),
                'itemCount'      => $order->get_item_count(),
                'carrier'        => $tracking_info['carrier'],
                'trackingNumber' => $tracking_info['tracking_number'],
                'trackingUrl'    => $tracking_info['tracking_url'],
                'orderUrl'       => $order->get_view_order_url(),
            ),
        );

        $this->api->post('/api/ecommerce/orders', $payload);
    }

    /**
     * Extract shipment tracking details from official and third-party tracking plugins
     */
    private function extract_tracking_info($order) {
        $info = array(
            'carrier'         => 'Courier',
            'tracking_number' => '',
            'tracking_url'    => '',
        );

        $order_id = $order->get_id();

        // 1. Official WooCommerce Shipment Tracking Plugin
        $wc_tracking = get_post_meta($order_id, '_wc_shipment_tracking_items', true);
        if (!empty($wc_tracking) && is_array($wc_tracking) && !empty($wc_tracking[0])) {
            $first = $wc_tracking[0];
            $info['carrier']         = !empty($first['custom_tracking_provider']) ? $first['custom_tracking_provider'] : (!empty($first['tracking_provider']) ? $first['tracking_provider'] : 'Courier');
            $info['tracking_number'] = !empty($first['tracking_number']) ? $first['tracking_number'] : '';
            $info['tracking_url']    = !empty($first['custom_tracking_link']) ? $first['custom_tracking_link'] : '';
            return $info;
        }

        // 2. Advanced Shipment Tracking (AST) Plugin
        $ast_tracking = get_post_meta($order_id, '_ast_tracking_items', true);
        if (!empty($ast_tracking) && is_array($ast_tracking) && !empty($ast_tracking[0])) {
            $first = $ast_tracking[0];
            $info['carrier']         = !empty($first['formatted_tracking_provider']) ? $first['formatted_tracking_provider'] : 'Courier';
            $info['tracking_number'] = !empty($first['tracking_number']) ? $first['tracking_number'] : '';
            $info['tracking_url']    = !empty($first['ast_tracking_link']) ? $first['ast_tracking_link'] : '';
            return $info;
        }

        // 3. Generic custom meta or ShipStation
        $meta_num = get_post_meta($order_id, '_tracking_number', true);
        if (!empty($meta_num)) {
            $info['tracking_number'] = (string)$meta_num;
            $info['carrier']         = (string)get_post_meta($order_id, '_carrier', true) ?: 'Courier';
            $info['tracking_url']    = (string)get_post_meta($order_id, '_tracking_url', true);
        }

        return $info;
    }
}
