// Payment Service

class PaymentService {
    constructor(db) {
        this.db = db;
        this.tableName = 'client_payments'; // Updated table name
    }

    async create(payment) {
        try {
            const result = await this.db(this.tableName).insert(payment);
            return result;
        } catch (error) {
            console.error('Error creating payment:', error);
            throw new Error('Failed to create payment');
        }
    }

    async read(id) {
        try {
            const payment = await this.db(this.tableName).where({ id }).first();
            if (!payment) {
                throw new Error('Payment not found');
            }
            return payment;
        } catch (error) {
            console.error('Error reading payment:', error);
            throw new Error('Failed to read payment');
        }
    }

    async list() {
        try {
            const payments = await this.db(this.tableName);
            return payments;
        } catch (error) {
            console.error('Error listing payments:', error);
            throw new Error('Failed to list payments');
        }
    }

    async update(id, payment) {
        try {
            const result = await this.db(this.tableName).where({ id }).update(payment);
            if (result === 0) {
                throw new Error('Payment not found or no changes made');
            }
            return result;
        } catch (error) {
            console.error('Error updating payment:', error);
            throw new Error('Failed to update payment');
        }
    }
}

module.exports = PaymentService;