import mongoose, { Document, Model } from 'mongoose';

interface IVideo extends Document {
  youtubeId: string;
  title: string;
  description: string;
  duration: number; // in seconds
  thumbnail: string;
  category: string;
  tags: string[];
  reward: number;
  isActive: boolean;
  viewCount: number;
  completedViewCount: number;
  addedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new mongoose.Schema<IVideo>(
  {
    youtubeId: {
      type: String,
      required: [true, 'YouTube video ID is required'],
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, 'Video duration is required'],
      min: 0,
    },
    thumbnail: {
      type: String,
      required: [true, 'Video thumbnail URL is required'],
    },
    category: {
      type: String,
      required: [true, 'Video category is required'],
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    reward: {
      type: Number,
      required: [true, 'Video reward amount is required'],
      default: 1, // Default reward is ₹1
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    completedViewCount: {
      type: Number,
      default: 0,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
videoSchema.index({ youtubeId: 1 });
videoSchema.index({ isActive: 1 });
videoSchema.index({ category: 1 });
videoSchema.index({ tags: 1 });

const Video: Model<IVideo> = mongoose.model<IVideo>('Video', videoSchema);

export default Video; 