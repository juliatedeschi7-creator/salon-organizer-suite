import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'your_supabase_url';
const supabaseKey = 'your_supabase_key';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Process payment using Supabase.
 * @param {Object} paymentData - The data related to the payment.
 * @returns {Promise<Object>} - Response from the Supabase query.
 */
export const processPayment = async (paymentData) => {
    try {
        const { data, error } = await supabase
            .from('payments')
            .insert([paymentData]);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Payment processing error:', error);
        throw new Error('Payment failed, please try again later.');
    }
};

/**
 * Retrieve payment status.
 * @param {string} paymentId - The ID of the payment.
 * @returns {Promise<Object>} - Payment status response.
 */
export const getPaymentStatus = async (paymentId) => {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error retrieving payment status:', error);
        throw new Error('Could not retrieve payment status, please try again later.');
    }
};