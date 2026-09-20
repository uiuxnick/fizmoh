<?php
/**
 * Fizmoh Connect Admin Settings Screen
 */

if (!defined('ABSPATH')) {
    exit;
}

class Fizmoh_Admin {
    private $api;

    public function __construct($api) {
        $this->api = $api;

        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_ajax_fizmoh_test_ping', array($this, 'ajax_test_ping'));
    }

    public function add_admin_menu() {
        add_submenu_page(
            'woocommerce',
            __('Fizmoh Connect', 'fizmoh-connect'),
            __('Fizmoh Connect', 'fizmoh-connect'),
            'manage_woocommerce',
            'fizmoh-connect',
            array($this, 'render_settings_page')
        );
    }

    public function register_settings() {
        // API Settings
        register_setting('fizmoh_settings_group', 'fizmoh_api_endpoint');
        register_setting('fizmoh_settings_group', 'fizmoh_api_key');
        register_setting('fizmoh_settings_group', 'fizmoh_store_id');

        // Order Notifications
        register_setting('fizmoh_settings_group', 'fizmoh_notify_order_created');
        register_setting('fizmoh_settings_group', 'fizmoh_notify_order_processing');
        register_setting('fizmoh_settings_group', 'fizmoh_notify_order_completed');
        register_setting('fizmoh_settings_group', 'fizmoh_notify_order_cancelled');

        // Cart Abandonment
        register_setting('fizmoh_settings_group', 'fizmoh_abandoned_cart_enabled');

        // Newsletter & Opt-in
        register_setting('fizmoh_settings_group', 'fizmoh_enable_checkout_optin');
        register_setting('fizmoh_settings_group', 'fizmoh_checkout_optin_label');
        register_setting('fizmoh_settings_group', 'fizmoh_checkout_optin_default');

        // Storefront Widgets
        register_setting('fizmoh_settings_group', 'fizmoh_enable_floating_widget');
        register_setting('fizmoh_settings_group', 'fizmoh_widget_phone');
        register_setting('fizmoh_settings_group', 'fizmoh_widget_position');
        register_setting('fizmoh_settings_group', 'fizmoh_widget_default_message');
        register_setting('fizmoh_settings_group', 'fizmoh_enable_product_wa_button');
    }

    public function ajax_test_ping() {
        check_ajax_referer('fizmoh_admin_nonce', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array('message' => 'Permission denied'));
        }

        $res = $this->api->test_connection();

        if (is_wp_error($res)) {
            wp_send_json_error(array('message' => $res->get_error_message()));
        }

        wp_send_json_success(array('message' => 'Connection verified successfully!'));
    }

    public function render_settings_page() {
        $endpoint = get_option('fizmoh_api_endpoint', 'https://app.fizmoh.cloud');
        $api_key = get_option('fizmoh_api_key', '');
        $store_id = get_option('fizmoh_store_id', '');
        ?>
        <div class="wrap" style="max-width: 900px; margin-top: 20px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                <div style="background: #00E785; border-radius: 8px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; font-size: 24px;">💬</div>
                <div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700;"><?php esc_html_e('Fizmoh Connect for WooCommerce', 'fizmoh-connect'); ?></h1>
                    <p style="margin: 4px 0 0; color: #64748b;"><?php esc_html_e('Automated WhatsApp order updates, abandoned cart recovery, and newsletter synchronization.', 'fizmoh-connect'); ?></p>
                </div>
            </div>

            <?php settings_errors(); ?>

            <form method="post" action="options.php" style="background: #fff; padding: 24px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <?php settings_fields('fizmoh_settings_group'); ?>

                <h2 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 17px;"><?php esc_html_e('1. API Credentials', 'fizmoh-connect'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Fizmoh API Endpoint', 'fizmoh-connect'); ?></th>
                        <td>
                            <input type="url" name="fizmoh_api_endpoint" value="<?php echo esc_attr($endpoint); ?>" class="regular-text" required />
                            <p class="description"><?php esc_html_e('Default: https://app.fizmoh.cloud', 'fizmoh-connect'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Workspace API Key', 'fizmoh-connect'); ?></th>
                        <td>
                            <input type="password" name="fizmoh_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" required />
                            <p class="description"><?php esc_html_e('Found in your Fizmoh Dashboard under Settings -> API Keys.', 'fizmoh-connect'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Store ID (Optional)', 'fizmoh-connect'); ?></th>
                        <td>
                            <input type="text" name="fizmoh_store_id" value="<?php echo esc_attr($store_id); ?>" class="regular-text" />
                            <p class="description"><?php esc_html_e('Optional identifier for this store if you manage multiple storefronts.', 'fizmoh-connect'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th></th>
                        <td>
                            <button type="button" id="fizmoh-test-ping-btn" class="button button-secondary">
                                🔌 <?php esc_html_e('Test Connection', 'fizmoh-connect'); ?>
                            </button>
                            <span id="fizmoh-ping-result" style="margin-left: 10px; font-weight: 600;"></span>
                        </td>
                    </tr>
                </table>

                <h2 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 17px; margin-top: 30px;"><?php esc_html_e('2. Automated Order Notifications (WhatsApp)', 'fizmoh-connect'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Order Created', 'fizmoh-connect'); ?></th>
                        <td>
                            <label><input type="checkbox" name="fizmoh_notify_order_created" value="yes" <?php checked('yes', get_option('fizmoh_notify_order_created', 'yes')); ?> /> <?php esc_html_e('Send order confirmation with [Track Order] button', 'fizmoh-connect'); ?></label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Order Processing', 'fizmoh-connect'); ?></th>
                        <td>
                            <label><input type="checkbox" name="fizmoh_notify_order_processing" value="yes" <?php checked('yes', get_option('fizmoh_notify_order_processing', 'yes')); ?> /> <?php esc_html_e('Send preparation alert when order status changes to Processing', 'fizmoh-connect'); ?></label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Order Shipped / Completed', 'fizmoh-connect'); ?></th>
                        <td>
                            <label><input type="checkbox" name="fizmoh_notify_order_completed" value="yes" <?php checked('yes', get_option('fizmoh_notify_order_completed', 'yes')); ?> /> <?php esc_html_e('Send dispatch notification with courier tracking link', 'fizmoh-connect'); ?></label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Order Cancelled / Refunded', 'fizmoh-connect'); ?></th>
                        <td>
                            <label><input type="checkbox" name="fizmoh_notify_order_cancelled" value="yes" <?php checked('yes', get_option('fizmoh_notify_order_cancelled', 'yes')); ?> /> <?php esc_html_e('Send cancellation alert with support button', 'fizmoh-connect'); ?></label>
                        </td>
                    </tr>
                </table>

                <h2 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 17px; margin-top: 30px;"><?php esc_html_e('3. Abandoned Cart Recovery', 'fizmoh-connect'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Real-time Field Tracking', 'fizmoh-connect'); ?></th>
                        <td>
                            <label><input type="checkbox" name="fizmoh_abandoned_cart_enabled" value="yes" <?php checked('yes', get_option('fizmoh_abandoned_cart_enabled', 'yes')); ?> /> <?php esc_html_e('Capture shopper phone number in real-time as they type in checkout to recover abandoned carts', 'fizmoh-connect'); ?></label>
                            <p class="description"><?php esc_html_e('Automated 15-min nudge, 4-hour coupon, and 24-hour urgency WhatsApp messages will be triggered.', 'fizmoh-connect'); ?></p>
                        </td>
                    </tr>
                </table>

                <h2 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 17px; margin-top: 30px;"><?php esc_html_e('4. WhatsApp Opt-In & Newsletter', 'fizmoh-connect'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Checkout Checkbox', 'fizmoh-connect'); ?></th>
                        <td>
                            <label><input type="checkbox" name="fizmoh_enable_checkout_optin" value="yes" <?php checked('yes', get_option('fizmoh_enable_checkout_optin', 'yes')); ?> /> <?php esc_html_e('Add WhatsApp updates opt-in checkbox on checkout', 'fizmoh-connect'); ?></label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Checkbox Label', 'fizmoh-connect'); ?></th>
                        <td>
                            <input type="text" name="fizmoh_checkout_optin_label" value="<?php echo esc_attr(get_option('fizmoh_checkout_optin_label', 'Receive live order tracking & exclusive promotions via WhatsApp')); ?>" class="large-text" />
                        </td>
                    </tr>
                </table>

                <h2 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 17px; margin-top: 30px;"><?php esc_html_e('5. Storefront Customer Widgets', 'fizmoh-connect'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Floating WhatsApp Button', 'fizmoh-connect'); ?></th>
                        <td>
                            <label><input type="checkbox" name="fizmoh_enable_floating_widget" value="yes" <?php checked('yes', get_option('fizmoh_enable_floating_widget', 'yes')); ?> /> <?php esc_html_e('Show floating WhatsApp chat button across store', 'fizmoh-connect'); ?></label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('WhatsApp Phone Number', 'fizmoh-connect'); ?></th>
                        <td>
                            <input type="text" name="fizmoh_widget_phone" value="<?php echo esc_attr(get_option('fizmoh_widget_phone', '')); ?>" placeholder="+968..." class="regular-text" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Order on WhatsApp Button', 'fizmoh-connect'); ?></th>
                        <td>
                            <label><input type="checkbox" name="fizmoh_enable_product_wa_button" value="yes" <?php checked('yes', get_option('fizmoh_enable_product_wa_button', 'yes')); ?> /> <?php esc_html_e('Add "Order via WhatsApp" button on Single Product Pages', 'fizmoh-connect'); ?></label>
                        </td>
                    </tr>
                </table>

                <?php submit_button(__('Save Settings', 'fizmoh-connect')); ?>
            </form>
        </div>

        <script>
        jQuery(document).ready(function($) {
            $('#fizmoh-test-ping-btn').on('click', function() {
                var $btn = $(this);
                var $status = $('#fizmoh-ping-result');
                $btn.prop('disabled', true).text('Testing...');
                $status.text('').css('color', '#64748b');

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'fizmoh_test_ping',
                        nonce: '<?php echo wp_create_nonce('fizmoh_admin_nonce'); ?>'
                    },
                    success: function(res) {
                        $btn.prop('disabled', false).text('🔌 Test Connection');
                        if (res.success) {
                            $status.css('color', '#059669').text('✅ Connected to Fizmoh Cloud!');
                        } else {
                            $status.css('color', '#dc2626').text('❌ ' + (res.data ? res.data.message : 'Error'));
                        }
                    },
                    error: function() {
                        $btn.prop('disabled', false).text('🔌 Test Connection');
                        $status.css('color', '#dc2626').text('❌ Network error');
                    }
                });
            });
        });
        </script>
        <?php
    }
}
