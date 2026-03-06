// src/services/paymentService.ts

import { ClientPayment } from '../models/clientPaymentModel'; // Assuming you have a model defined
import { DatabaseError } from '../errors/DatabaseError'; // Assuming you have a custom error class

/**
 * Class for managing client payments
 */
export class PaymentService {
    
    /**
     * Create a new client payment
     * @param paymentData - The data for the new payment
     */
    public async createPayment(paymentData: ClientPayment) {
        try {
            const payment = await ClientPayment.create(paymentData);
            return payment;
        } catch (error) {
            throw new DatabaseError('Error creating payment: ' + error.message);
        }
    }

    /**
     * Get all payments for a client
     * @param clientId - The ID of the client
     */
    public async getPaymentsForClient(clientId: string) {
        try {
            const payments = await ClientPayment.findAll({ where: { clientId } });
            return payments;
        } catch (error) {
            throw new DatabaseError('Error fetching payments: ' + error.message);
        }
    }

    /**
     * Update a client payment
     * @param paymentId - The ID of the payment
     * @param paymentData - The new data for the payment
     */
    public async updatePayment(paymentId: string, paymentData: Partial<ClientPayment>) {
        try {
            const payment = await ClientPayment.update(paymentData, { where: { id: paymentId } });
            return payment;
        } catch (error) {
            throw new DatabaseError('Error updating payment: ' + error.message);
        }
    }

    /**
     * Delete a client payment
     * @param paymentId - The ID of the payment
     */
    public async deletePayment(paymentId: string) {
        try {
            const result = await ClientPayment.destroy({ where: { id: paymentId } });
            return result > 0;
        } catch (error) {
            throw new DatabaseError('Error deleting payment: ' + error.message);
        }
    }
}