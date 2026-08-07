import { RequestHandler } from 'express';
import * as inspectionsService from './inspections.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

export const getCaseForCar: RequestHandler = async (req, res, next) => {
  try {
    res.json(await inspectionsService.getCaseForCar(paramValue(req.params.carId)));
  } catch (err) {
    next(err);
  }
};

export const submitSellerInspection: RequestHandler = async (req, res, next) => {
  try {
    const round = await inspectionsService.submitSellerInspection(paramValue(req.params.carId), req.body, req.user!.id);
    res.status(201).json(round);
  } catch (err) {
    next(err);
  }
};

export const requestTechnicianVisit: RequestHandler = async (req, res, next) => {
  try {
    const round = await inspectionsService.requestTechnicianVisit(paramValue(req.params.carId), req.body, {
      adminId: req.user!.id
    });
    res.status(201).json(round);
  } catch (err) {
    next(err);
  }
};

// Public: anyone can see a car's inspection/maintenance history (badge + rounds), no auth
// required - this is exactly the "show the buyer the existing file" step from the product plan.
export const getPublicCaseForCar: RequestHandler = async (req, res, next) => {
  try {
    res.json(await inspectionsService.getCaseForCar(paramValue(req.params.carId)));
  } catch (err) {
    next(err);
  }
};

// A logged-in customer (buyer or renter) who doesn't trust the existing file requests a real
// inspection themselves - maps their BUY/RENT intent onto the same requestedByRole the admin
// side uses, then reuses the identical service logic (opens a new round, keeps full history).
export const requestTechnicianVisitAsCustomer: RequestHandler = async (req, res, next) => {
  try {
    const requestedByRole = req.body.intent === 'RENT' ? 'RENTER' : 'BUYER';
    const round = await inspectionsService.requestTechnicianVisit(
      paramValue(req.params.carId),
      { requestedByRole, notes: req.body.notes },
      { customerId: req.customer!.id }
    );
    res.status(201).json(round);
  } catch (err) {
    next(err);
  }
};

export const uploadInspectionFile: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'file is required' });
    }
    const result = await inspectionsService.uploadInspectionFile(paramValue(req.params.carId), req.file);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

export const scheduleRound: RequestHandler = async (req, res, next) => {
  try {
    res.json(await inspectionsService.scheduleRound(paramValue(req.params.roundId), req.body));
  } catch (err) {
    next(err);
  }
};

export const startRound: RequestHandler = async (req, res, next) => {
  try {
    res.json(await inspectionsService.startRound(paramValue(req.params.roundId)));
  } catch (err) {
    next(err);
  }
};

export const submitReport: RequestHandler = async (req, res, next) => {
  try {
    res.json(await inspectionsService.submitReport(paramValue(req.params.roundId), req.body));
  } catch (err) {
    next(err);
  }
};

export const certifyRound: RequestHandler = async (req, res, next) => {
  try {
    res.json(await inspectionsService.certifyRound(paramValue(req.params.roundId)));
  } catch (err) {
    next(err);
  }
};

export const cancelRound: RequestHandler = async (req, res, next) => {
  try {
    res.json(await inspectionsService.cancelRound(paramValue(req.params.roundId)));
  } catch (err) {
    next(err);
  }
};

export const flagRoundAsFraudulent: RequestHandler = async (req, res, next) => {
  try {
    const round = await inspectionsService.flagRoundAsFraudulent(
      paramValue(req.params.roundId),
      req.user!.id,
      req.body.reason
    );
    res.json(round);
  } catch (err) {
    next(err);
  }
};

export const listTechnicians: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await inspectionsService.listTechnicians());
  } catch (err) {
    next(err);
  }
};

export const createTechnician: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await inspectionsService.createTechnician(req.body));
  } catch (err) {
    next(err);
  }
};

export const updateTechnician: RequestHandler = async (req, res, next) => {
  try {
    res.json(await inspectionsService.updateTechnician(paramValue(req.params.technicianId), req.body));
  } catch (err) {
    next(err);
  }
};
