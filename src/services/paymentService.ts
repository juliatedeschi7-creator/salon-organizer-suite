import { ClientPayment } from '../models/ClientPayment';

export class PaymentService {
    async processPayment(paymentData) {
        try {
            // Assuming you have some logic to validate paymentData
            const payment = await ClientPayment.create(paymentData);
            return payment;
        } catch (error) {
            console.error('Error processing payment:', error);
            throw new Error('Payment processing failed. Please try again later.');
        }
    }

    async retrievePayments(clientId) {
        try {
            const payments = await ClientPayment.findAll({ where: { clientId } });
            return payments;
        } catch (error) {
            console.error('Error retrieving payments:', error);
            throw new Error('Failed to retrieve payments. Please contact support.');
        }
    }

    async deletePayment(paymentId) {
        try {
            const result = await ClientPayment.destroy({ where: { id: paymentId } });
            if (result === 0) {
                throw new Error('Payment not found');
            }
            return { message: 'Payment deleted successfully' };
        } catch (error) {
            console.error('Error deleting payment:', error);
            throw new Error('Failed to delete payment. Please contact support.');
        }
    }
}