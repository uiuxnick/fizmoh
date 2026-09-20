<?php
/**
 * Fizmoh WhatsApp Opt-In & Newsletter Integration
 */

if (!defined('ABSPATH')) {
    exit;
}

class Fizmoh_Newsletter {
    private $api;

    public function __construct($api) {
        $this->api = $api;

        // Checkout opt-in checkbox
        if (get_option('fizmoh_enable_checkout_optin', 'yes') === 'yes') {
            add_action('woocommerce_after_checkout_billing_form', array($this, 'render_checkout_optin'));
            add_action('woocommerce_checkout_update_order_meta', array($this, 'save_checkout_optin'));
            add_action('woocommerce_thankyou', array($this, 'sync_optin_on_order_complete'), 10, 1);
        }

        // Newsletter Shortcode
        add_shortcode('fizmoh_newsletter_box', array($this, 'render_newsletter_shortcode'));
        add_action('wp_ajax_fizmoh_submit_newsletter', array($this, 'ajax_submit_newsletter'));
        add_action('wp_ajax_nopriv_fizmoh_submit_newsletter', array($this, 'ajax_submit_newsletter'));
    }

    /**
     * Render WhatsApp Opt-in Checkbox on Checkout
     */
    public function render_checkout_optin($checkout) {
        $label = get_option('fizmoh_checkout_optin_label', 'Receive live order tracking & exclusive promotions via WhatsApp');
        $default_checked = get_option('fizmoh_checkout_optin_default', 'yes') === 'yes' ? 1 : 0;

        echo '<div class="fizmoh-checkout-optin-wrap" style="margin: 15px 0 20px 0; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">';
        woocommerce_form_field('fizmoh_whatsapp_optin', array(
            'type'          => 'checkbox',
            'class'         => array('fizmoh-optin-checkbox form-row-wide'),
            'label_class'   => array('woocommerce-form__label woocommerce-form__label-for-checkbox checkbox'),
            'input_class'   => array('woocommerce-form__input woocommerce-form__input-checkbox input-checkbox'),
            'label'         => '<strong>💬 ' . esc_html($label) . '</strong>',
            'required'      => false,
            'default'       => $default_checked,
        ), $checkout->get_value('fizmoh_whatsapp_optin'));
        echo '</div>';
    }

    /**
     * Save checkbox value in order meta
     */
    public function save_checkout_optin($order_id) {
        if (!empty($_POST['fizmoh_whatsapp_optin'])) {
            update_post_meta($order_id, '_fizmoh_whatsapp_optin', 'yes');
        } else {
            update_post_meta($order_id, '_fizmoh_whatsapp_optin', 'no');
        }
    }

    /**
     * Sync opt-in to Fizmoh when order completes
     */
    public function sync_optin_on_order_complete($order_id) {
        if (!$order_id) return;
        $order = wc_get_order($order_id);
        if (!$order) return;

        $optin = get_post_meta($order_id, '_fizmoh_whatsapp_optin', true);
        if ($optin !== 'yes') return;

        $phone = $order->get_billing_phone();
        if (empty($phone)) $phone = $order->get_shipping_phone();
        if (empty($phone)) return;

        $name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()) ?: 'Subscriber';

        $this->api->post('/api/ecommerce/newsletter', array(
            'storeId'     => $this->api->get_store_id(),
            'phone'       => $phone,
            'email'       => $order->get_billing_email(),
            'name'        => $name,
            'source'      => 'CHECKOUT_OPTIN',
            'tags'        => array('newsletter_subscriber', 'purchaser'),
            'sendWelcome' => false, // already receiving order confirmation
        ));
    }

    /**
     * Newsletter Box Shortcode: [fizmoh_newsletter_box]
     */
    public function render_newsletter_shortcode($atts) {
        $atts = shortcode_atts(array(
            'title'       => 'Join our VIP WhatsApp Club',
            'description' => 'Get private deals, flash coupons, and early access on WhatsApp.',
            'button_text' => 'Subscribe',
        ), $atts, 'fizmoh_newsletter_box');

        ob_start();
        ?>
        <div class="fizmoh-newsletter-card" style="max-width: 440px; padding: 24px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center;">
            <div style="font-size: 28px; margin-bottom: 8px;">🎁</div>
            <h4 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b;"><?php echo esc_html($atts['title']); ?></h4>
            <p style="margin: 0 0 16px; font-size: 14px; color: #64748b;"><?php echo esc_html($atts['description']); ?></p>
            <form class="fizmoh-newsletter-form" style="display: flex; flex-direction: column; gap: 10px;">
                <input type="text" name="subscriber_name" placeholder="<?php esc_attr_e('Your Name', 'fizmoh-connect'); ?>" style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;" required />
                <input type="tel" name="subscriber_phone" placeholder="<?php esc_attr_e('WhatsApp Number (e.g. +968...)', 'fizmoh-connect'); ?>" style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;" required />
                <button type="submit" style="padding: 12px; background: #00E785; color: #022c16; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; transition: opacity 0.2s;">
                    <?php echo esc_html($atts['button_text']); ?>
                </button>
                <div class="fizmoh-newsletter-msg" style="display: none; margin-top: 8px; font-size: 13px;"></div>
            </form>
        </div>
        <script>
        jQuery(document).ready(function($) {
            $('.fizmoh-newsletter-form').on('submit', function(e) {
                e.preventDefault();
                var $form = $(this);
                var $msg = $form.find('.fizmoh-newsletter-msg');
                var name = $form.find('input[name="subscriber_name"]').val();
                var phone = $form.find('input[name="subscriber_phone"]').val();

                $form.find('button').prop('disabled', true).text('Subscribing...');

                $.ajax({
                    url: '<?php echo admin_url('admin-ajax.php'); ?>',
                    type: 'POST',
                    data: {
                        action: 'fizmoh_submit_newsletter',
                        name: name,
                        phone: phone
                    },
                    success: function(res) {
                        $form.find('button').prop('disabled', false).text('Subscribed');
                        $msg.show().css('color', '#059669').text('🎉 Thank you! Check your WhatsApp for your welcome gift.');
                    },
                    error: function() {
                        $form.find('button').prop('disabled', false).text('Try Again');
                        $msg.show().css('color', '#dc2626').text('Error subscribing. Please try again.');
                    }
                });
            });
        });
        </script>
        <?php
        return ob_get_clean();
    }

    public function ajax_submit_newsletter() {
        $name = isset($_POST['name']) ? sanitize_text_field($_POST['name']) : 'Subscriber';
        $phone = isset($_POST['phone']) ? sanitize_text_field($_POST['phone']) : '';

        if (empty($phone)) {
            wp_send_json_error(array('message' => 'Phone required'));
        }

        $res = $this->api->post('/api/ecommerce/newsletter', array(
            'storeId'     => $this->api->get_store_id(),
            'phone'       => $phone,
            'name'        => $name,
            'source'      => 'SHORTCODE_FORM',
            'tags'        => array('newsletter_subscriber', 'vip_club'),
            'sendWelcome' => true,
        ));

        if (is_wp_error($res)) {
            wp_send_json_error(array('message' => $res->get_error_message()));
        }

        wp_send_json_success($res);
    }
}
