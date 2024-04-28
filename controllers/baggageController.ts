import { Request, Response, NextFunction } from 'express';
import { ErrorHandler } from "../utils/ErrorHandler";
import { catchAsyncError } from "../middleware/catchAsyncError";
import AlertingServices from '../services/alertingService'; //  alertingService 
const Baggage = require("../models/baggage");


// Function to create a new baggage document upon check-in
export const createBaggage = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { flightInformation, expectedPath } = req.body;

    if (!flightInformation || !expectedPath) {
      return next(new ErrorHandler('Missing required fields', 400));
    }

    const newBaggage = new Baggage({
      flightInformation,
      expectedPath,
      currentLocation: expectedPath[0], // Set current location to first checkpoint
    });
    newBaggage.actualPath.push({ checkpoint: expectedPath[0], scannedAt: Date.now() });

    await newBaggage.save();
    

    res.status(201).json({ message: 'Baggage created successfully', baggage: newBaggage });
  } catch (error) {
    console.error(error);
    next(new ErrorHandler('Error creating baggage', 500));
  }
});

// Function to update baggage location upon checkpoint scan
export const updateBaggageLocation = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, scannedLocation } = req.body;

    if (!id || !scannedLocation) {
      return next(new ErrorHandler('Missing required fields', 400));
    }

    const baggage = await Baggage.findById(id);

    if (!baggage) {
      return next(new ErrorHandler('Baggage not found', 404));
    }

    const expectedIndex = baggage.expectedPath.indexOf(scannedLocation);
    // const expectedLocation = baggage.expectedPath[0];

    let redAlert;
    if (expectedIndex === -1) {
        // AlertingServices.sendInvalidCheckpointAlert(id, scannedLocation, baggage.expectedPath, baggage.actualPath)
        // return next(new ErrorHandler('Invalid checkpoint location', 400));
        redAlert={
            id,
            scannedLocation,
            expectedPath: baggage.expectedPath,
            actualPath: baggage.actualPath,
          };    
    }
console.log(expectedIndex,baggage.actualPath.length,baggage.actualPath)
    if (expectedIndex !== baggage.actualPath.length) {
      // Checkpoint mismatch - potential missed scan
      console.warn(`Checkpoint mismatch for baggage ${id}`);
      // Implement logic to trigger an alert here (e.g., call a separate function)
    }

    baggage.currentLocation = scannedLocation;
    baggage.actualPath.push({ checkpoint: scannedLocation, scannedAt: Date.now() });

    await baggage.save();


    res.status(200).json({ message: 'Baggage location updated successfully' , redAlert});
  } catch (err: any) {
    return next(new ErrorHandler(err.message, 400));
  }
});

// Function to retrieve baggage information by ID (optional)
export const getBaggageById = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;

    const baggage = await Baggage.findById(id);

    if (!baggage) {
      return next(new ErrorHandler('Baggage not found', 404));
    }

    res.status(200).json({ baggage });
  } catch (err:any) {
    console.error(err);
    return next(new ErrorHandler(err.message, 400));
  }
});
