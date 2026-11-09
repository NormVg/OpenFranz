export type StrategyRecord = {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StrategyInput = {
  title: string;
  content: string;
  isActive?: boolean;
};
