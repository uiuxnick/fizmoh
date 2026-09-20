<?php
/**
 * Plugin Name: Fizmoh Connect for WooCommerce
 * Plugin URI: https://fizmoh.cloud/integrations/woocommerce
 * Description: Real-time WhatsApp order tracking, multi-stage abandoned cart recovery, and customer newsletter synchronization for WooCommerce.
 * Version: 2.0.0
 * Author: Fizmoh Cloud
 * Author URI: https://fizmoh.cloud
 * Text Domain: fizmoh-connect
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 6.0
 * WC tested up to: 9.3
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

define('FIZMOH_CONNECT_VERSION', '2.0.0');
define('FIZMOH_CONNECT_FILE', __FILE__);
define('FIZMOH_CONNECT_PATH', plugin_dir_path(__FILE__));
define('FIZMOH_CONNECT_URL', plugin_dir_url(__FILE__));

// Declare WooCommerce High-Performance Order Storage (HPOS) compatibility
add_action('before_woocommerce_init', function () {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', FIZMOH_CONNECT_FILE, true);
    }
});

// Autoload plugin classes
require_once FIZMOH_CONNECT_PATH . 'includes/class-fizmoh-api.php';
require_once FIZMOH_CONNECT_PATH . 'includes/class-fizmoh-order-sync.php';
require_once FIZMOH_CONNECT_PATH . 'includes/class-fizmoh-cart-tracker.php';
require_once FIZMOH_CONNECT_PATH . 'includes/class-fizmoh-newsletter.php';
require_once FIZMOH_CONNECT_PATH . 'includes/class-fizmoh-widgets.php';
require_once FIZMOH_CONNECT_PATH . 'includes/class-fizmoh-admin.php';

/**
 * Initialize Fizmoh Connect plugin
 */
final class Fizmoh_Connect_Plugin {
    private static $instance = null;

    public $api;
    public $order_sync;
    public $cart_tracker;
    public $newsletter;
    public $widgets;
    public $admin;

    public static function instance() {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('plugins_loaded', array($this, 'init'));
    }

    public function init() {
        // Check if WooCommerce is active
        if (!class_exists('WooCommerce')) {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
            return;
        }

        $this->api          = new Fizmoh_API_Client();
        $this->order_sync   = new Fizmoh_Order_Sync($this->api);
        $this->cart_tracker = new Fizmoh_Cart_Tracker($this->api);
        $this->newsletter   = new Fizmoh_Newsletter($this->api);
        $this->widgets      = new Fizmoh_Storefront_Widgets();
        $this->admin        = new Fizmoh_Admin($this->api);

        // Enqueue frontend scripts & styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
    }

    public function enqueue_assets() {
        wp_enqueue_style(
            'fizmoh-storefront',
            FIZMOH_CONNECT_URL . 'assets/css/fizmoh-storefront.css',
            array(),
            FIZMOH_CONNECT_VERSION
        );
    }

    public function woocommerce_missing_notice() {
        echo '<div class="error"><p>' . esc_html__('Fizmoh Connect requires WooCommerce to be installed and activated.', 'fizmoh-connect') . '</p></div>';
    }
}

Fizmoh_Connect_Plugin::instance();
