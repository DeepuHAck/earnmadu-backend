import mongoose, { Document, Model } from 'mongoose';

interface IVideoView extends Document {
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  watchDuration: number; // in seconds
  completed: boolean;
  rewarded: boolean;
  rewardAmount: number;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const videoViewSchema = new mongoose.Schema<IVideoView>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    watchDuration: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    rewarded: {
      type: Boolean,
      default: false,
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
videoViewSchema.index({ userId: 1, videoId: 1 });
videoViewSchema.index({ userId: 1, completed: 1 });
videoViewSchema.index({ videoId: 1, completed: 1 });
videoViewSchema.index({ ipAddress: 1, createdAt: 1 });

// Compound index for preventing duplicate views within a time window
videoViewSchema.index(
  { userId: 1, videoId: 1, createdAt: 1 },
  { unique: true, partialFilterExpression: { completed: true } }
);

const VideoView: Model<IVideoView> = mongoose.model<IVideoView>('VideoView', videoViewSchema);

export default VideoView; 