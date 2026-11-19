// Canonical Sovereign Master 59-District Atlas Dataset
// Strictly deduplicated: 646 Destinations with verified 15-Point Dossier
// State-level modular architecture for zero-delay loading
import { ANDHRA_PRADESH_ATLAS } from './masterAtlasAP.js';
import { TELANGANA_ATLAS } from './masterAtlasTG.js';

export { ANDHRA_PRADESH_ATLAS } from './masterAtlasAP.js';
export { TELANGANA_ATLAS } from './masterAtlasTG.js';

export const MASTER_ATLAS_DATA = {
  version: "3.0.0",
  updatedAt: "2026-10-08",
  totalDistricts: 59,
  andhraPradeshCount: 26,
  telanganaCount: 33,
  andhraPradesh: ANDHRA_PRADESH_ATLAS,
  telangana: TELANGANA_ATLAS
};

export default MASTER_ATLAS_DATA;
