import mongoose,{ Schema, Document } from "mongoose";

export interface Baggage extends Document {
  _id: string;
  flightInformation: {
    airline: string;
    flightNumber: string;
    origin: string;
    destination: string;
  };
  checkInTime: Date;
  currentLocation: string; // Checkpoint ID or name
  expectedPath: string[]; // Array of checkpoint IDs in order
  actualPath: {
    checkpoint: string; // Checkpoint ID
    scannedAt: Date;
  }[];
}

const baggageSchema = new Schema<Baggage>({
  flightInformation: {
    airline: { type: String, required: true },
    flightNumber: { type: String, required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
  },
  checkInTime: { type: Date, required: true, default: Date.now },
  currentLocation: { type: String, required: true },
  expectedPath: { type: [String], required: true },
  actualPath: {
    type: [
      {
        checkpoint: { type: String, required: true },
        scannedAt: { type: Date, required: true, default: Date.now },
      },
    ],
  },
});


const Baggage=mongoose.model('Baggage',baggageSchema);
module.exports =Baggage;
