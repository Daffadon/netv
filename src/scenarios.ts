// The data contract and closed vocabularies stay in src/schema.js so tools/validate.js can run the
// same file under Node without a build. The scenario files register themselves on NETV in order.
import './schema.js';
import '../data/scenario-http.js';
import '../data/http/1-boot.js';
import '../data/http/2-resolve.js';
import '../data/http/3-connect.js';
import '../data/http/4-request.js';
import '../data/http/5-response.js';
import '../data/scenario-routing.js';
import '../data/routing/1-ospf.js';
import '../data/routing/2-bgp.js';
import '../data/quizzes/dhcp.js';
import '../data/quizzes/dns.js';
import '../data/quizzes/http.js';
import '../data/quizzes/ospf.js';
import '../data/quizzes/bgp.js';

export const NETV = globalThis.NETV;

export const HEADER_ORDER = NETV.HEADER_ORDER;
export const HEADER_LABELS = NETV.HEADER_LABELS;
export const HEADER_ROW = NETV.HEADER_ROW;
export const HEADER_CHIP = NETV.HEADER_CHIP;
export const LAYERS = NETV.LAYERS;
export const DELIVERY = NETV.DELIVERY;
export const FIELD_HELP = NETV.FIELD_HELP;
export const delivery = NETV.delivery;
export const citationUrl = NETV.citationUrl;
export const boardOf = NETV.boardOf;
export const scenarios = NETV.scenarios;
