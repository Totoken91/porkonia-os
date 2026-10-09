"use client";
import { creerStock } from './provisionsStore';
const bieres=creerStock('biere');
export const commanderBieres=bieres.commander;
export const prendreBiere=bieres.prendre;
export const surLivraison=bieres.surLivraison;
export const useCave=bieres.useStock;
