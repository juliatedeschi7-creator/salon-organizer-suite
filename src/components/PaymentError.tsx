import React from 'react';

interface PaymentErrorProps {
    retry: () => void;
    errorMessage?: string;
}

const PaymentError: React.FC<PaymentErrorProps> = ({ retry, errorMessage }) => {
    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <h2>Payment Error</h2>
            <p>{errorMessage || 'An unexpected error occurred while processing your payment.'}</p>
            <button onClick={retry} style={{ padding: '10px 20px', fontSize: '16px' }}>
                Retry
            </button>
        </div>
    );
};

export default PaymentError;