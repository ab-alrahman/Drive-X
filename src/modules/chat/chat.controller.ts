import { RequestHandler } from 'express';
import * as chatService from './chat.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

/* ---------- Customer ---------- */

export const createThread: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await chatService.createOrGetThreadForCustomer(req.customer!.id, req.body.carId));
  } catch (err) {
    next(err);
  }
};

export const listMyThreads: RequestHandler = async (req, res, next) => {
  try {
    res.json(await chatService.listCustomerThreads(req.customer!.id));
  } catch (err) {
    next(err);
  }
};

export const getMyThreadMessages: RequestHandler = async (req, res, next) => {
  try {
    res.json(
      await chatService.getThreadMessages(paramValue(req.params.threadId), {
        type: 'CUSTOMER',
        id: req.customer!.id
      })
    );
  } catch (err) {
    next(err);
  }
};

export const postMyMessage: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(
      await chatService.postMessage(
        paramValue(req.params.threadId),
        { type: 'CUSTOMER', id: req.customer!.id },
        req.body.body
      )
    );
  } catch (err) {
    next(err);
  }
};

/* ---------- Seller / Platform Admin ---------- */

export const listAdminThreads: RequestHandler = async (req, res, next) => {
  try {
    if (req.user!.role === 'PLATFORM_ADMIN') {
      res.json(await chatService.listAllThreads());
      return;
    }
    res.json(await chatService.listVendorThreads(req.user!.vendorId!));
  } catch (err) {
    next(err);
  }
};

export const getAdminThreadMessages: RequestHandler = async (req, res, next) => {
  try {
    const isPlatformAdmin = req.user!.role === 'PLATFORM_ADMIN';
    res.json(
      await chatService.getThreadMessages(paramValue(req.params.threadId), {
        type: isPlatformAdmin ? 'ADMIN' : 'VENDOR',
        id: req.user!.id,
        vendorId: req.user!.vendorId
      })
    );
  } catch (err) {
    next(err);
  }
};

// Only vendor operators can reply; Platform Admin is read-only oversight and is
// blocked by requireRole('OWNER', 'STAFF') on the route.
export const postAdminMessage: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(
      await chatService.postMessage(
        paramValue(req.params.threadId),
        { type: 'VENDOR', id: req.user!.id, vendorId: req.user!.vendorId },
        req.body.body
      )
    );
  } catch (err) {
    next(err);
  }
};
