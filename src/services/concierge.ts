/**
 * @deprecated Use receptionistService instead.
 * Shim de compatibilidad tras la migración al recepcionista con IA.
 */
export {
  receptionistService as conciergeService,
  resetReceptionistSession as resetConciergeSession,
} from './receptionistService';

export type { ReceptionistMessage } from './receptionistService';
