/**
 * Razorpay Payment Client Helper
 * Handles opening the official Razorpay Checkout popup modal,
 * capturing payment signatures, and routing to verification.
 */
export function openRazorpayCheckout({
  keyId,
  amountInPaise,
  orderId,
  circuitName,
  touristName = 'Verified Visitor',
  touristEmail = 'tourist@globetrottergateway.in',
  touristPhone = '9999999999',
  onSuccess,
  onDismiss,
}) {
  if (typeof window === 'undefined' || !window.Razorpay) {
    console.warn('Razorpay SDK not loaded. Operating in offline/preview simulation.');
    if (onSuccess) {
      onSuccess({
        razorpay_payment_id: `pay_sim_${Date.now()}`,
        razorpay_order_id: orderId || `order_sim_${Date.now()}`,
        razorpay_signature: `sig_sim_${Date.now()}`,
        simulated: true,
      });
    }
    return;
  }

  const options = {
    key: keyId || 'rzp_test_DEMO_KEY_HERE',
    amount: amountInPaise, // in paise (e.g. 28000 = ₹280)
    currency: 'INR',
    name: 'Globetrotter Gateway',
    description: `${circuitName} Entry Pass`,
    image: '/favicon.svg',
    order_id: orderId,
    handler: function (response) {
      if (onSuccess) {
        onSuccess({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          simulated: false,
        });
      }
    },
    prefill: {
      name: touristName,
      email: touristEmail,
      contact: touristPhone,
    },
    notes: {
      portal: 'Globetrotter Gateway AP-TG',
      pass_type: 'Official Regional Tourism Circuit',
    },
    theme: {
      color: '#06B6D4', // Cyan accent
      backdrop_color: 'rgba(6, 8, 13, 0.95)',
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      },
    },
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error('Failed to initialize Razorpay modal:', err);
    if (onDismiss) onDismiss();
  }
}
