import mongoose, { Document, Model } from 'mongoose';

interface IWithdrawal extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  paymentMethod: 'phonePe' | 'googlePay' | 'paytm' | 'paypal' | 'bank';
  paymentDetails: Record<string, string>;
  transactionId?: string;
  adminNote?: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new mongoose.Schema<IWithdrawal>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Withdrawal amount is required'],
      min: [1, 'Minimum withdrawal amount is ₹1'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['phonePe', 'googlePay', 'paytm', 'paypal', 'bank'],
      required: true,
    },
    paymentDetails: {
      type: Map,
      of: String,
      required: true,
    },
    transactionId: {
      type: String,
    },
    adminNote: {
      type: String,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
withdrawalSchema.index({ userId: 1, status: 1 });
withdrawalSchema.index({ status: 1, createdAt: 1 });
withdrawalSchema.index({ paymentMethod: 1 });

const Withdrawal: Model<IWithdrawal> = mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema);

export default Withdrawal; 