/** Correspondance type d'appli → composant. Les applis elles-mêmes sont déclarées dans le pack. */
import type { ComponentType } from "react";
import type { AppKind } from "@/content/types";
import { Bienvenue } from "./bienvenue/Bienvenue";
import { Executer } from "./executer/Executer";
import { Mail } from "./mail/Mail";
import { ChannelPork } from "./channel-pork/ChannelPork";
import { Config } from "./config/Config";
import { Fichiers, Texte, Visionneuse } from "./fichiers/Fichiers";
import { Navigateur } from "./navigateur/Navigateur";
import { NappeVide } from "./nappe-vide/NappeVide";
import { Distinctions } from "./distinctions/Distinctions";

export const APPS: Record<AppKind, ComponentType> = {
  bienvenue: Bienvenue,
  executer: Executer,
  mail: Mail,
  navigateur: Navigateur,
  "channel-pork": ChannelPork,
  "nappe-vide": NappeVide,
  config: Config,
  fichiers: Fichiers,
  visionneuse: Visionneuse,
  texte: Texte,
  distinctions: Distinctions,
};
