import express, { NextFunction, Request, Response } from "express";
// Importing the necessary controllers and middleware
import {  createBaggage, updateBaggageLocation, getBaggageById } from "../../controllers/baggageController";
import { isAuthenticated } from "../../middleware/auth";

// Creating a new router instance
const router = express.Router();

//later add middleware in route to authenticate

// Route to create a new baggage document upon check-in
router.post('/', createBaggage);

// Route to update baggage location upon checkpoint scan
router.put('/updatelocation', updateBaggageLocation);

// Route to retrieve baggage information by ID 
router.get('/:id', getBaggageById);

// Exporting the router module
module.exports = router;
