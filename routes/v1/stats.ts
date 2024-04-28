import express, { NextFunction, Request, Response } from "express";
// Importing the necessary controllers and middleware

import {
    getMissedCheckpoints,
    getRedAlertBags,
    getOrangeAlertBags,
    getLocationStats,
  } from '../../controllers/statsController'; //'
import { isAuthenticated } from "../../middleware/auth";

// Creating a new router instance
const router = express.Router();


// Function to get the number of bags at each location today
router.get('/getLocationStats', getLocationStats);
//get bags at wrong locations(at location not in expected path)
router.get('/red-alert-bags', getRedAlertBags);
//get bags at missed locations(at location as in expected path but not in same order)
router.get('/orange-alert-bags', getOrangeAlertBags);


router.get('/missed-checkpoints', getMissedCheckpoints);
// Exporting the router module
module.exports = router;
