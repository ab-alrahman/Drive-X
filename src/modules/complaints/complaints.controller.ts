import { RequestHandler } from 'express';
import * as complaintsService from './complaints.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

// Logged-in customer filing a complaint against a listing - trust signal for the marketplace.
export const submitComplaint: RequestHandler = async (req, res, next) => {
  try {
    const complaint = await complaintsService.submitComplaint(
      paramValue(req.params.carId),
      req.customer!.id,
      req.body.description
    );
    res.status(201).json(complaint);
  } catch (err) {
    next(err);
  }
};

export const listComplaints: RequestHandler = async (req, res, next) => {
  try {
    res.json(await complaintsService.listComplaintsForPlatform(req.query));
  } catch (err) {
    next(err);
  }
};

export const reviewComplaint: RequestHandler = async (req, res, next) => {
  try {
    res.json(
      await complaintsService.reviewComplaint(paramValue(req.params.complaintId), req.body, req.user!.id)
    );
  } catch (err) {
    next(err);
  }
};
