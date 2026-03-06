// src/services/paymentService.ts

import { Payment } from '../models/Payment';

// Update to use the correct table name
const TABLE_NAME = 'client_payments';

// Error handling type
type ErrorHandler = (error: Error) => void;

// Function to list payments
export const listPayments = async (): Promise<Payment[]> => {
    try {
        // Code to list payments
        return await database.query(`SELECT * FROM ${TABLE_NAME}`);
    } catch (error) {
        handleError(error);
        throw new Error('Failed to list payments');
    }
};

// Function to create a payment
export const createPayment = async (paymentData: Payment): Promise<void> => {
    try {
        await database.query(`INSERT INTO ${TABLE_NAME} (amount, date, clientId) VALUES (?, ?, ?)`, [paymentData.amount, paymentData.date, paymentData.clientId]);
    } catch (error) {
        handleError(error);
        throw new Error('Failed to create payment');
    }
};

// Function to read a specific payment by ID
export const readPayment = async (id: number): Promise<Payment | null> => {
    try {
        const result = await database.query(`SELECT * FROM ${TABLE_NAME} WHERE id = ?`, [id]);
        return result.length ? result[0] : null;
    } catch (error) {
        handleError(error);
        throw new Error('Failed to read payment');
    }
};

// Error handling function
const handleError: ErrorHandler = (error) => {
    console.error('Database error:', error);
};