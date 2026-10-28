export type HeaderKey =
  | 'ethernet'
  | 'arp'
  | 'ip'
  | 'ospf'
  | 'tcp'
  | 'udp'
  | 'dns'
  | 'dhcp'
  | 'http'
  | 'bgp';

export type HeaderFields = Record<string, string | number>;

export interface Citation {
  rfc: number;
  sec: string;
  title: string;
}

export interface EvidenceTable {
  columns: string[];
  rows: (string | number)[][];
  caption?: string;
}

export interface Step {
  id: string;
  phase: string;
  title: string;
  say: string;
  actor: string;
  hop?: string[];
  dir: 'out' | 'in' | 'none';
  osi: number[];
  pdu: string;
  fields?: Partial<Record<HeaderKey, HeaderFields>>;
  explain: string;
  analogy?: string;
  changes?: string[];
  note?: string;
  table?: EvidenceTable;
  cite: Citation[];
}

export interface Node {
  id: string;
  label: string;
  sub: string;
  subBefore?: string;
  subFrom?: string;
  x: number;
  y: number;
  kind: 'host' | 'switch' | 'router' | 'server' | 'dns';
  note?: string;
}

export interface Link {
  from: string;
  to: string;
  dashed?: boolean;
  cost?: number;
}

export interface Region {
  as: string;
  nodes: string[];
}

export interface Board {
  aria?: string;
  nodes: Node[];
  links: Link[];
  regions?: Region[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export interface Scenario {
  id: string;
  nav?: string;
  title: string;
  subtitle: string;
  phases: string[];
  preamble?: string;
  nodes?: Node[];
  links?: Link[];
  boards?: Record<string, Board>;
  steps: Step[];
  quizzes?: Record<string, QuizQuestion[]>;
}

export interface DeliveryMode {
  word: string;
  note: string;
}

export interface Layer {
  name: string;
  osi: number[];
  help: string;
}

export interface Netv {
  HEADER_ORDER: HeaderKey[];
  HEADER_LABELS: Record<HeaderKey, string>;
  HEADER_ROW: Record<HeaderKey, string>;
  HEADER_CHIP: Record<HeaderKey, string>;
  LAYERS: Layer[];
  DELIVERY: Record<'broadcast' | 'multicast' | 'unicast' | 'local', DeliveryMode>;
  FIELDS: Record<HeaderKey, string[] | null>;
  FIELD_HELP: Record<HeaderKey, Record<string, string>>;
  scenarios: Record<string, Scenario>;
  delivery: (step: Step) => 'broadcast' | 'multicast' | 'unicast' | 'local';
  citationUrl: (citation: Citation) => string;
  boardOf: (scenario: Scenario, phase: string) => Board;
  scenario: (id: string) => Scenario;
  defineScenario: (config: Scenario) => Scenario;
  addSteps: (scenarioId: string, steps: Step[]) => Scenario;
  addQuiz: (scenarioId: string, phase: string, questions: QuizQuestion[]) => Scenario;
  stepIndex: (scenarioId: string, stepId: string) => number;
}

declare global {
  var NETV: Netv;
  interface Window {
    NETV: Netv;
  }
}
