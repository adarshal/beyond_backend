import { Request, Response, NextFunction } from "express";
import { ErrorHandler } from "../utils/ErrorHandler";
import { catchAsyncError } from "../middleware/catchAsyncError";
const Baggage = require("../models/baggage");

const today = new Date().toISOString().slice(0, 10); // Get today's date string

// Function to get the number of bags at each location today
export const getLocationStats = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locations = await Baggage.aggregate([
        {
          $match: {
            currentLocation: { $ne: null },
            "actualPath.scannedAt": { $gte: new Date(today) },
          },
        },
        { $group: { _id: "$currentLocation", count: { $sum: 1 } } },
      ]);

      res.status(200).json({ locationStats: locations });
    } catch (err) {
      console.error(err);
      return next(new ErrorHandler("Error fetching location stats", 500));
    }
  }
);

// Function to get the number of bags not reaching destination on time
//TODO: nned to modify and correct it
export const getDelayedBags = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thresholdString = String(req.query?.threshold);
      let threshold: number;

      if (thresholdString !== undefined && thresholdString !== null) {
        try {
          threshold = parseInt(thresholdString, 10);
        } catch (error) {
          console.error("Error parsing threshold:", error);
          return next(new ErrorHandler("Invalid threshold value", 400)); // Assuming ErrorHandler for error handling
        }
      } else {
        threshold = 60; // Use default threshold if thresholdString is missing or nullish
      }

      const delayedBags = await Baggage.aggregate([
        {
          $match: {
            "expectedPath.length": { $gt: 1 },
            "actualPath.length": { $gt: 0 },
          },
        }, // Bags with expected path and at least one scan
        {
          $lookup: {
            from: "checkpoints", // Assuming a 'checkpoints' collection with estimated times
            localField: "expectedPath.0", // Assuming first element of expectedPath is the origin
            foreignField: "_id",
            as: "originCheckpoint",
          },
        },
        { $unwind: "$originCheckpoint" }, // Unwind to access origin checkpoint data
        {
          $addFields: {
            expectedArrival: {
              $add: [
                "$originCheckpoint.estimatedTime",
                {
                  $sum: {
                    $map: {
                      input: "$actualPath",
                      as: "scan",
                      output: {
                        $subtract: [
                          "$$scan.scannedAt",
                          "$originCheckpoint.startTime",
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $match: {
            "actualPath.scannedAt": { $gt: new Date(today) }, // Filter for scans today
            $expr: {
              $gt: [
                { $subtract: [new Date(), "$actualPath.scannedAt"] },
                { $multiply: [60000, threshold] },
              ],
            }, // Check if actual scan time exceeds expected arrival by threshold
          },
        },
        { $count: "count" },
      ]);

      const count = delayedBags.length ? delayedBags[0].count : 0;
      res.status(200).json({ delayedBags: count });
    } catch (error) {
      console.error(error);
      return next(new ErrorHandler("Error fetching delayed bags stats", 500));
    }
  }
);


//calculates the number of missed checkpoints for each baggage item:
// TODO add todays date or last 24 hrs so that filtering will be faster
export const getMissedCheckpoints = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const missedCheckpoints = await Baggage.aggregate([
        { $match: { 'expectedPath.length': { $gt: 1 }, 'actualPath.length': { $gt: 0 } } }, // Bags with expected path and at least one scan
        {
          $unwind: '$actualPath', // Unwind actualPath for individual scans
        },
        {
          $lookup: {
            from: 'checkpoints',
            localField: 'actualPath.checkpoint',
            foreignField: '_id',
            as: 'scannedCheckpoint',
          },
        },
        { $unwind: '$scannedCheckpoint' }, // Unwind scannedCheckpoint for data
        {
          $group: {
            _id: '$_id', // Group by baggage ID
            expectedCheckpoints: { $addToSet: '$expectedPath' }, // Collect all expected checkpoints
            scannedLocations: { $addToSet: '$scannedCheckpoint.location' }, // Collect scanned locations
          },
        },
        {
          $project: {
            _id: 1,
            expectedCheckpoints: 1,
            scannedLocations: 1,
            missedCheckpoints: {
              $filter: {
                input: '$expectedCheckpoints',
                as: 'expectedCheckpoint',
                cond: { $nin: ['$expectedCheckpoint', '$scannedLocations'] },
              },
            },
          },
        },
        { $unwind: '$missedCheckpoints' }, // Unwind missedCheckpoints for count
        { $count: 'count' },
      ]);

      const totalMissed = missedCheckpoints.length ? missedCheckpoints[0].count : 0;
      res.status(200).json({ missedCheckpoints: totalMissed });
    } catch (error) {
      console.error(error);
      return next(new ErrorHandler('Error fetching missed checkpoints stats', 500));
    }
  }
);


//red alert bags, / bags on unexpected location
export const getRedAlertBags = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
//         const redAlertBags = await Baggage.aggregate([
//           { $unwind: '$expectedPath' },
//   {
//     $project: {
//       _id: 1,
//       currentLocation: 1,
//       expectedLocation: '$expectedPath'
//     }
//   },
//   {
//     $match: {
//       currentLocation: { $nin: '$expectedLocation' }
//     }
//   },
//   { $project: { _id: 1, currentLocation: 1 } } // Only return ID and current location
// ]);
const redAlertBags = await Baggage.find({
  $expr: {
    $not: {
      $in: ["$currentLocation", "$expectedPath"]
    }
  }
});

  
        res.status(200).json({ redAlertBags });
      } catch (error) {
        console.error(error);
        return next(new ErrorHandler('Error fetching red alert bags', 500));
      }
    }
  );

  //orange alert
  export const getOrangeAlertBags = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // const orangeAlertBags = await Baggage.aggregate([
        //   // Match bags with expected path and at least one scan
        //   { $match: { 'expectedPath.length': { $gt: 1 }, 'actualPath.length': { $gt: 0 } } },
        //   // Unwind actualPath for individual scans
        //   { $unwind: '$actualPath' },
        //   // Lookup scanned checkpoint details
        //   {
        //     $lookup: {
        //       from: 'checkpoints',
        //       localField: 'actualPath.checkpoint',
        //       foreignField: '_id',
        //       as: 'scannedCheckpoint',
        //     },
        //   },
        //   // Unwind scannedCheckpoint for data
        //   { $unwind: '$scannedCheckpoint' },
        //   // Group by baggage ID
        //   {
        //     $group: {
        //       _id: '$_id',
        //       expectedCheckpoints: { $addToSet: '$expectedPath' },
        //       scannedLocations: { $addToSet: '$scannedCheckpoint.location' },
        //     },
        //   },
        //   // Filter bags with orange alert checkpoints
        //   {
        //     $project: {
        //       _id: 1,
        //       orangeAlertCheckpoints: {
        //         $setDifference: [
        //           '$expectedCheckpoints',
        //           '$scannedLocations'
        //         ]
        //       }
        //     }
        //   },
        //   // Filter for bags with orange alerts
        //   { $match: { orangeAlertCheckpoints: { $ne: [] } } },
        //   // Only return ID
        //   { $project: { _id: 1 } },
        //   // Filter for bags with orange alerts
        //   { $match: { orangeAlertCheckpoints: { $ne: [] } } },
        //   // Only return ID
        //   { $project: { _id: 1 } },
        // ]);
        const orangeAlertBags: any[] = [];
      
      // Fetch all baggage documents
      const allBags = await Baggage.find({});

      // Iterate over each baggage document
      for (const bag of allBags) {
        const { expectedPath, actualPath, currentLocation } = bag;
        const scannedLocations = actualPath.map((scan: any) => scan.checkpoint);

        // Find the index of the current location in actualPath
        const currentIndex = scannedLocations.indexOf(currentLocation);

        // If current location is not found, continue to next bag
        if (currentIndex === -1) continue;

        // Check for missed checkpoints before the current location
        const missedCheckpoints = expectedPath.filter((checkpoint: string, index: number) => {
          return index < currentIndex && !scannedLocations.includes(checkpoint);
        });

        if (missedCheckpoints.length > 0) {
          // Bag has missed checkpoints before current location, consider it as an orange alert
          orangeAlertBags.push({
            _id: bag._id,
            missedCheckpoints
          });
        }
      }


  
        // res.status(200).json({ orangeAlertBags: orangeAlertBags.map((bag:any) => bag._id) });
        res.status(200).json({ orangeAlertBags });
      } catch (error) {
        console.error(error);
        return next(new ErrorHandler('Error fetching orange alert bags', 500));
      }
    }
  );