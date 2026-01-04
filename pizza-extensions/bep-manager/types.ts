
export interface FixedCost {
  id: string;
  label: string;
  amount: number;
  category: 'affitto' | 'utenze' | 'personale' | 'altro';
}

export interface VariableIncidence {
  foodCost: number; // in percentuale
  service: number;  // packaging, posate, etc in percentuale
  waste: number;    // sfrido/errori in percentuale
}

export interface BepData {
  fixedCosts: FixedCost[];
  variableIncidence: VariableIncidence;
  averageTicket: number;
}
