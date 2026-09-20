/**
 * Fizmoh Connect - Checkout Pre-submit Field Listener
 */
(function ($) {
    'use strict';

    var debounceTimer = null;
    var lastCapturedPhone = '';

    function sendCartUpdate() {
        var phone = $('#billing_phone').val();
        var email = $('#billing_email').val();
        var firstName = $('#billing_first_name').val();
        var lastName = $('#billing_last_name').val();

        if (!phone || phone.trim().length < 7) {
            return;
        }

        phone = phone.trim();
        if (phone === lastCapturedPhone) {
            return;
        }

        $.ajax({
            url: fizmoh_tracker_params.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'fizmoh_track_checkout',
                nonce: fizmoh_tracker_params.nonce,
                phone: phone,
                email: email,
                first_name: firstName,
                last_name: lastName
            },
            success: function (res) {
                if (res && res.success) {
                    lastCapturedPhone = phone;
                }
            }
        });
    }

    $(document).ready(function () {
        // Debounced trigger on input/change
        $(document).on('input change blur', '#billing_phone, #billing_email, #billing_first_name, #billing_last_name', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(sendCartUpdate, 800);
        });
    });
})(jQuery);
