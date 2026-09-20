<?php
/**
 * Fizmoh Storefront Widgets (Floating WhatsApp Button & Product WhatsApp Order)
 */

if (!defined('ABSPATH')) {
    exit;
}

class Fizmoh_Storefront_Widgets {
    public function __construct() {
        if (get_option('fizmoh_enable_floating_widget', 'yes') === 'yes') {
            add_action('wp_footer', array($this, 'render_floating_chat_widget'));
        }

        if (get_option('fizmoh_enable_product_wa_button', 'yes') === 'yes') {
            add_action('woocommerce_after_add_to_cart_button', array($this, 'render_product_wa_button'));
        }
    }

    /**
     * Floating WhatsApp Chat Button
     */
    public function render_floating_chat_widget() {
        $phone = get_option('fizmoh_widget_phone', '');
        if (empty($phone)) return;

        $clean_phone = preg_replace('/\D/', '', $phone);
        $position = get_option('fizmoh_widget_position', 'right');
        $pos_style = $position === 'left' ? 'left: 20px;' : 'right: 20px;';
        $message = get_option('fizmoh_widget_default_message', 'Hello! I am browsing your store and have a question.');
        $wa_url = 'https://wa.me/' . $clean_phone . '?text=' . rawurlencode($message);
        ?>
        <div id="fizmoh-floating-wa" style="position: fixed; bottom: 25px; <?php echo $pos_style; ?> z-index: 999999; display: flex; align-items: center; gap: 10px;">
            <a href="<?php echo esc_url($wa_url); ?>" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; background-color: #25D366; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.25); text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.693.074-2.127-.514-1.579-.646-2.58-2.261-2.659-2.366-.079-.105-.639-.85-.639-1.623 0-.773.407-1.155.552-1.312.145-.157.316-.197.422-.197.106 0 .211.002.303.007.098.005.228-.037.355.268.131.316.449 1.096.488 1.176.039.08.065.173.013.277-.052.105-.078.172-.157.265-.079.092-.167.206-.238.277-.08.08-.163.167-.07.327.092.16.41 677.882 1.097.607.541 1.119.708 1.278.788.16.08.252.067.345-.04.093-.106.397-.463.503-.622.106-.158.212-.132.357-.08.145.053.923.435 1.082.514.159.08.265.119.304.185.04.066.04.385-.104.79z"/>
                </svg>
            </a>
        </div>
        <?php
    }

    /**
     * "Order on WhatsApp" button on Single Product Page
     */
    public function render_product_wa_button() {
        global $product;
        if (!$product) return;

        $phone = get_option('fizmoh_widget_phone', '');
        if (empty($phone)) return;

        $clean_phone = preg_replace('/\D/', '', $phone);
        $title = $product->get_name();
        $sku = $product->get_sku() ? ' (SKU: ' . $product->get_sku() . ')' : '';
        $price = wc_price($product->get_price());
        $url = $product->get_permalink();

        $text = sprintf(
            __('Hello, I would like to order: %s%s - Price: %s. Link: %s', 'fizmoh-connect'),
            $title,
            $sku,
            wp_strip_all_tags($price),
            $url
        );

        $wa_url = 'https://wa.me/' . $clean_phone . '?text=' . rawurlencode($text);
        ?>
        <div class="fizmoh-order-wa-wrap" style="margin-top: 10px;">
            <a href="<?php echo esc_url($wa_url); ?>" target="_blank" rel="noopener noreferrer" class="button fizmoh-order-wa-btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #25D366; color: #fff; font-weight: 700; padding: 12px; border-radius: 6px; text-decoration: none; border: none; font-size: 15px; margin-top: 6px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.693.074-2.127-.514-1.579-.646-2.58-2.261-2.659-2.366-.079-.105-.639-.85-.639-1.623 0-.773.407-1.155.552-1.312.145-.157.316-.197.422-.197.106 0 .211.002.303.007.098.005.228-.037.355.268.131.316.449 1.096.488 1.176.039.08.065.173.013.277-.052.105-.078.172-.157.265-.079.092-.167.206-.238.277-.08.08-.163.167-.07.327.092.16.41 677.882 1.097.607.541 1.119.708 1.278.788.16.08.252.067.345-.04.093-.106.397-.463.503-.622.106-.158.212-.132.357-.08.145.053.923.435 1.082.514.159.08.265.119.304.185.04.066.04.385-.104.79z"/>
                </svg>
                <?php esc_html_e('Order via WhatsApp', 'fizmoh-connect'); ?>
            </a>
        </div>
        <?php
    }
}
