"use client";
import { creerStock } from './provisionsStore';
const saucissons=creerStock('saucisson');
export const commanderSaucissons=saucissons.commander;
export const prendreSaucisson=saucissons.prendre;
export const surLivraisonSaucisson=saucissons.surLivraison;
export const useGardeManger=saucissons.useStock;
