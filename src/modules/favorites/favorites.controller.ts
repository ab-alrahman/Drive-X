import { RequestHandler } from 'express';
import * as favoritesService from './favorites.service';

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

export const listFavorites: RequestHandler = async (req, res, next) => {
  try {
    res.json(await favoritesService.listFavorites(req.customer!.id));
  } catch (err) {
    next(err);
  }
};

export const addFavorite: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await favoritesService.addFavorite(req.customer!.id, paramValue(req.params.carId)));
  } catch (err) {
    next(err);
  }
};

export const removeFavorite: RequestHandler = async (req, res, next) => {
  try {
    res.json(await favoritesService.removeFavorite(req.customer!.id, paramValue(req.params.carId)));
  } catch (err) {
    next(err);
  }
};
