import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Error handling function
const handleError = (error: any) => {
    if (error) {
        console.error('Error:', error.message);
        throw new Error(error.message);
    }
};

// Function to fetch payments
export const fetchPayments = async () => {
    const { data, error } = await supabase
        .from('payments')
        .select('*');
    
    handleError(error);
    return data;
};

// Function to create a payment
export const createPayment = async (paymentData: any) => {
    const { data, error } = await supabase
        .from('payments')
        .insert([paymentData]);
    
    handleError(error);
    return data;
};

// Function to fetch charges
export const fetchCharges = async () => {
    const { data, error } = await supabase
        .from('charges')
        .select('*');
    
    handleError(error);
    return data;
};

// Function to create a charge
export const createCharge = async (chargeData: any) => {
    const { data, error } = await supabase
        .from('charges')
        .insert([chargeData]);
    
    handleError(error);
    return data;
};

// Export more queries and operations as necessary
